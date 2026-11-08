'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const cache = require('../../lib/cache');
const storage = require('../../services/storage');
const settings = require('../../services/settings');
const notify = require('../../services/notify');
const partnerService = require('../partners/service');
const payments = require('../payments');
const vehicles = require('../vehicles');
const trips = require('../trips');
const reviews = require('../reviews');
const { signAdmin } = require('../../lib/jwt');
const { validate, z, idParam, trimmed, optText, pageQuery, money } = require('../../lib/validate');
const { requireAdmin, invalidateAuthCache } = require('../../middleware/auth');
const { adminLoginLimiter } = require('../../middleware/rateLimit');
const { badRequest, notFound, unauthorized, forbidden } = require('../../lib/errors');
const { paginate, pageMeta, placeKey } = require('../../lib/util');

// Real bcrypt hash used to keep login timing constant when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const router = express.Router();
// Any admin change (suspensions, cancellations, approvals) may affect public listings.
router.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => res.statusCode < 400 && Promise.all([cache.delPrefix('trips:search:'), cache.delPrefix('rent:'), cache.delPrefix('mkt:')]).catch(() => {}));
  next();
});
const ANY = requireAdmin();
const MANAGER = requireAdmin('super_admin', 'admin');
const SUPER = requireAdmin('super_admin');

async function audit(req, action, entityType, entityId, details) {
  await prisma.auditLog.create({ data: { adminId: req.admin?.id, action, entityType, entityId: entityId != null ? String(entityId) : null, details, ip: req.ip } }).catch(() => {});
}

const like = (q) => ({ contains: q, mode: 'insensitive' });
const dateRange = (from, to) => (from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lt: new Date(to.getTime() + 86400_000) } : {}) } : undefined);
const listQuery = (extra = {}) => z.object({ q: z.string().trim().max(100).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), ...pageQuery, ...extra });

// ============================ AUTH ============================
router.post('/auth/login', adminLoginLimiter, validate({ body: z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }) }), async (req, res) => {
  const admin = await prisma.adminUser.findUnique({ where: { email: req.body.email } });
  // Compare against a dummy hash when the user doesn't exist to keep timing constant.
  const ok = await bcrypt.compare(req.body.password, admin?.passwordHash || DUMMY_HASH);
  if (!admin || !ok || !admin.isActive) {
    await audit({ ip: req.ip }, 'admin.login_failed', 'admin', admin?.id, { email: req.body.email });
    throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await audit({ ip: req.ip, admin }, 'admin.login', 'admin', admin.id);
  res.json({ success: true, data: { token: signAdmin(admin), admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } } });
});

router.get('/auth/me', ANY, (req, res) => res.json({ success: true, data: req.admin }));

router.post('/auth/change-password', ANY, validate({ body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10, 'Use at least 10 characters').max(200) }) }), async (req, res) => {
  const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
  if (!(await bcrypt.compare(req.body.currentPassword, admin.passwordHash))) throw badRequest('Current password is incorrect');
  const updated = await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(req.body.newPassword, 12), tokenVersion: { increment: 1 } } });
  await cache.del(`auth:admin:${admin.id}`);
  await audit(req, 'admin.password_changed', 'admin', admin.id);
  res.json({ success: true, data: { token: signAdmin(updated) } });
});

// ============================ DASHBOARD ============================
router.get('/dashboard', ANY, async (_req, res) => {
  const data = await cache.wrap('admin:dashboard', 30, async () => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const since30 = new Date(Date.now() - 30 * 86400_000);
    const [users, blocked, newUsers30, partnersByCat, partnerStatus, verifStatus, listedDrivers, vehicleStatus, rentalListed, upcomingTrips, bookingStatus, revenueAll, revenueMonth, openTickets, signupSeries, revenueSeries, categories] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'blocked' } }),
      prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      prisma.partner.groupBy({ by: ['categoryId'], _count: { _all: true } }),
      prisma.partner.groupBy({ by: ['accountStatus'], _count: { _all: true } }),
      prisma.partner.groupBy({ by: ['verificationStatus'], where: { accountStatus: 'active' }, _count: { _all: true } }),
      prisma.driverProfile.count({ where: { isListed: true } }),
      prisma.vehicle.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
      prisma.vehicle.count({ where: { forRental: true, verificationStatus: 'approved', rentalAvailable: true } }),
      prisma.trip.count({ where: { status: 'scheduled', departureAt: { gte: new Date() } } }),
      prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.payment.aggregate({ where: { status: 'paid' }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.payment.aggregate({ where: { status: 'paid', paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.$queryRaw`SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count FROM users WHERE created_at >= ${since30} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw`SELECT to_char(date_trunc('day', paid_at AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COALESCE(SUM(amount),0)::int AS amount, COUNT(*)::int AS count FROM payments WHERE status = 'paid' AND paid_at >= ${since30} GROUP BY 1 ORDER BY 1`,
      prisma.partnerCategory.findMany({ select: { id: true, code: true, name: true } }),
    ]);
    const g = (rows, key, val) => rows.find((r) => r[key] === val)?._count._all || 0;
    const totalPartners = partnerStatus.reduce((a, r) => a + r._count._all, 0);
    return {
      users: { total: users, customers: users - totalPartners, partners: totalPartners, blocked, newLast30Days: newUsers30 },
      partners: {
        byCategory: categories.map((c) => ({ code: c.code, name: c.name, count: partnersByCat.find((p) => p.categoryId === c.id)?._count._all || 0 })),
        onboarding: g(partnerStatus, 'accountStatus', 'onboarding'),
        active: g(partnerStatus, 'accountStatus', 'active'),
        suspended: g(partnerStatus, 'accountStatus', 'suspended'),
        pendingVerification: g(verifStatus, 'verificationStatus', 'pending'),
        verified: g(verifStatus, 'verificationStatus', 'approved'),
        listedDrivers,
      },
      vehicles: { pending: g(vehicleStatus, 'verificationStatus', 'pending'), approved: g(vehicleStatus, 'verificationStatus', 'approved'), rejected: g(vehicleStatus, 'verificationStatus', 'rejected'), suspended: g(vehicleStatus, 'verificationStatus', 'suspended'), rentalListed },
      trips: { upcoming: upcomingTrips },
      bookings: Object.fromEntries(bookingStatus.map((b) => [b.status, b._count._all])),
      revenue: { total: revenueAll._sum.amount || 0, totalCount: revenueAll._count._all, thisMonth: revenueMonth._sum.amount || 0, thisMonthCount: revenueMonth._count._all },
      openTickets,
      series: { signups: signupSeries, revenue: revenueSeries },
    };
  });
  res.json({ success: true, data });
});

// ============================ USERS ============================
router.get('/users', ANY, validate({ query: listQuery({ status: z.enum(['active', 'blocked']).optional(), type: z.enum(['customer', 'partner']).optional() }) }), async (req, res) => {
  const q = req.query;
  const { page, limit, skip, take } = paginate(q);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.type === 'partner' ? { partner: { isNot: null } } : q.type === 'customer' ? { partner: { is: null } } : {}),
    ...(q.q ? { OR: [{ fullName: like(q.q) }, { phone: { contains: q.q.replace(/\s/g, '') } }, { email: like(q.q) }] } : {}),
    ...(dateRange(q.from, q.to) ? { createdAt: dateRange(q.from, q.to) } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: { id: true, phone: true, fullName: true, email: true, status: true, city: true, createdAt: true, lastLoginAt: true, partner: { select: { id: true, accountStatus: true, category: { select: { name: true } } } }, _count: { select: { bookings: true } } } }),
    prisma.user.count({ where }),
  ]);
  res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
});

router.get('/users/:id', ANY, validate({ params: idParam }), async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { partner: { include: { category: true } }, bookings: { orderBy: { createdAt: 'desc' }, take: 20, include: { trip: { select: { originName: true, destinationName: true, departureAt: true } } } }, tickets: { orderBy: { createdAt: 'desc' }, take: 10 }, _count: { select: { bookings: true, sessions: true } } },
  });
  if (!u) throw notFound('User');
  res.json({ success: true, data: { ...u, photoUrl: await storage.url(u.photoKey) } });
});

router.post('/users/:id/block', MANAGER, validate({ params: idParam, body: z.object({ reason: trimmed(255, 3) }) }), async (req, res) => {
  await prisma.$transaction([
    prisma.user.update({ where: { id: req.params.id }, data: { status: 'blocked', blockReason: req.body.reason } }),
    prisma.session.updateMany({ where: { userId: req.params.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  const p = await prisma.partner.findUnique({ where: { userId: req.params.id }, select: { id: true } });
  if (p) await partnerService.syncDriverListing(p.id);
  await invalidateAuthCache(req.params.id);
  await vehicles.clearPublicCache();
  await audit(req, 'user.block', 'user', req.params.id, req.body);
  res.json({ success: true, data: { blocked: true } });
});

router.post('/users/:id/unblock', MANAGER, validate({ params: idParam }), async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { status: 'active', blockReason: null } });
  const p = await prisma.partner.findUnique({ where: { userId: req.params.id }, select: { id: true } });
  if (p) await partnerService.syncDriverListing(p.id);
  await invalidateAuthCache(req.params.id);
  await audit(req, 'user.unblock', 'user', req.params.id);
  res.json({ success: true, data: { blocked: false } });
});

// ============================ PARTNERS ============================
router.get(
  '/partners',
  ANY,
  validate({ query: listQuery({ category: z.string().max(40).optional(), accountStatus: z.enum(['onboarding', 'active', 'suspended']).optional(), verificationStatus: z.enum(['unverified', 'pending', 'approved', 'rejected', 'suspended']).optional() }) }),
  async (req, res) => {
    const q = req.query;
    const { page, limit, skip, take } = paginate(q);
    const where = {
      ...(q.category ? { category: { code: q.category } } : {}),
      ...(q.accountStatus ? { accountStatus: q.accountStatus } : {}),
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus } : {}),
      ...(q.q ? { OR: [{ businessName: like(q.q) }, { district: like(q.q) }, { user: { fullName: like(q.q) } }, { user: { phone: { contains: q.q.replace(/\s/g, '') } } }] } : {}),
      ...(dateRange(q.from, q.to) ? { createdAt: dateRange(q.from, q.to) } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        orderBy: [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip,
        take,
        include: { user: { select: { id: true, fullName: true, phone: true, status: true } }, category: { select: { code: true, name: true } }, driverProfile: { select: { isListed: true } }, _count: { select: { vehicles: true, trips: true } } },
      }),
      prisma.partner.count({ where }),
    ]);
    res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
  }
);

router.get('/partners/:id', ANY, validate({ params: idParam }), async (req, res) => {
  const p = await prisma.partner.findUnique({
    where: { id: req.params.id },
    include: { user: true, category: { include: { requirements: true } }, documents: true, driverProfile: true, vehicles: { orderBy: { createdAt: 'desc' } }, payments: { orderBy: { createdAt: 'desc' } }, locationShare: true },
  });
  if (!p) throw notFound('Partner');
  const [bookingStats, tripStats, calls] = await Promise.all([
    prisma.booking.groupBy({ by: ['status'], where: { partnerId: p.id }, _count: { _all: true } }),
    prisma.trip.groupBy({ by: ['status'], where: { partnerId: p.id }, _count: { _all: true } }),
    prisma.contactEvent.count({ where: { partnerId: p.id } }),
  ]);
  const documents = await Promise.all(p.documents.map(async (d) => ({ ...d, frontUrl: await storage.url(d.frontKey, 600), backUrl: await storage.url(d.backKey, 600) })));
  res.json({
    success: true,
    data: {
      ...p,
      user: { ...p.user, photoUrl: await storage.url(p.user.photoKey) },
      documents,
      vehicles: await Promise.all(p.vehicles.map((v) => vehicles.serialize(v, { owner: true }))),
      payments: p.payments.map(payments.serialize),
      onboarding: await partnerService.onboardingState(p.userId),
      stats: { bookings: Object.fromEntries(bookingStats.map((b) => [b.status, b._count._all])), trips: Object.fromEntries(tripStats.map((t) => [t.status, t._count._all])), calls },
    },
  });
});

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: optText(500),
  documents: z.array(z.object({ id: z.number().int(), status: z.enum(['approved', 'rejected']), reason: optText(255) })).max(30).optional(),
});

router.post('/partners/:id/verify', MANAGER, validate({ params: idParam, body: decisionSchema }), async (req, res) => {
  const p = await prisma.partner.findUnique({ where: { id: req.params.id }, include: { documents: true } });
  if (!p) throw notFound('Partner');
  const { decision, reason, documents = [] } = req.body;
  if (decision === 'reject' && !reason) throw badRequest('Give a reason so the partner knows what to fix');
  await prisma.$transaction(async (tx) => {
    for (const d of documents) {
      if (!p.documents.find((x) => x.id === d.id)) continue;
      await tx.partnerDocument.update({ where: { id: d.id }, data: { status: d.status, rejectionReason: d.status === 'rejected' ? d.reason || reason || 'Not acceptable' : null, reviewedAt: new Date(), reviewedBy: req.admin.id } });
    }
    if (decision === 'approve') await tx.partnerDocument.updateMany({ where: { partnerId: p.id, status: 'pending' }, data: { status: 'approved', reviewedAt: new Date(), reviewedBy: req.admin.id } });
    await tx.partner.update({ where: { id: p.id }, data: decision === 'approve' ? { verificationStatus: 'approved', verifiedAt: new Date(), rejectionReason: null } : { verificationStatus: 'rejected', rejectionReason: reason } });
  });
  await invalidateAuthCache(p.userId);
  await partnerService.syncDriverListing(p.id);
  notify.partnerReviewed(p.userId, decision === 'approve', reason);
  await audit(req, `partner.${decision}`, 'partner', p.id, req.body);
  await cache.del('admin:dashboard');
  res.json({ success: true, data: { verificationStatus: decision === 'approve' ? 'approved' : 'rejected' } });
});

router.post('/partners/:id/suspend', MANAGER, validate({ params: idParam, body: z.object({ reason: trimmed(500, 3) }) }), async (req, res) => {
  const p = await prisma.partner.update({ where: { id: req.params.id }, data: { accountStatus: 'suspended', suspendedReason: req.body.reason } });
  await prisma.trip.updateMany({ where: { partnerId: p.id, status: 'scheduled' }, data: { bookingOpen: false } });
  await prisma.locationShare.updateMany({ where: { partnerId: p.id }, data: { isSharing: false } });
  await trips.clearSearchCache();
  await invalidateAuthCache(p.userId);
  await partnerService.syncDriverListing(p.id);
  await vehicles.clearPublicCache();
  notify.partnerSuspended(p.userId, req.body.reason);
  await audit(req, 'partner.suspend', 'partner', p.id, req.body);
  res.json({ success: true, data: { accountStatus: 'suspended' } });
});

router.post('/partners/:id/reactivate', MANAGER, validate({ params: idParam }), async (req, res) => {
  const p = await prisma.partner.findUnique({ where: { id: req.params.id } });
  if (!p) throw notFound('Partner');
  await prisma.partner.update({ where: { id: p.id }, data: { accountStatus: p.activatedAt ? 'active' : 'onboarding', suspendedReason: null } });
  await invalidateAuthCache(p.userId);
  await partnerService.syncDriverListing(p.id);
  await vehicles.clearPublicCache();
  await audit(req, 'partner.reactivate', 'partner', p.id);
  res.json({ success: true, data: { reactivated: true } });
});

/** Manually set / extend listing validity (e.g. offline payment or goodwill). */
router.patch('/partners/:id/listing', SUPER, validate({ params: idParam, body: z.object({ listingExpiresAt: z.coerce.date().nullable(), markFeePaid: z.boolean().optional(), note: trimmed(255, 3) }) }), async (req, res) => {
  const p = await prisma.partner.update({ where: { id: req.params.id }, data: { listingExpiresAt: req.body.listingExpiresAt, ...(req.body.markFeePaid ? { feePaidAt: new Date() } : {}) } });
  await invalidateAuthCache(p.userId);
  await partnerService.tryComplete(p.userId);
  await partnerService.syncDriverListing(p.id);
  await audit(req, 'partner.listing_override', 'partner', p.id, req.body);
  res.json({ success: true, data: { listingExpiresAt: p.listingExpiresAt } });
});

// ============================ VEHICLES ============================
router.get(
  '/vehicles',
  ANY,
  validate({ query: listQuery({ status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(), usage: z.enum(['trips', 'rental', 'goods']).optional(), partnerId: z.coerce.number().int().optional() }) }),
  async (req, res) => {
    const q = req.query;
    const { page, limit, skip, take } = paginate(q);
    const where = {
      ...(q.status ? { verificationStatus: q.status } : {}),
      ...(q.partnerId ? { partnerId: q.partnerId } : {}),
      ...(q.usage === 'trips' ? { forTrips: true } : q.usage === 'rental' ? { forRental: true } : q.usage === 'goods' ? { forGoods: true } : {}),
      ...(q.q ? { OR: [{ registrationNumber: { contains: q.q.toUpperCase().replace(/[\s-]/g, '') } }, { make: like(q.q) }, { model: like(q.q) }, { partner: { user: { fullName: like(q.q) } } }, { partner: { user: { phone: { contains: q.q } } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({ where, orderBy: q.status === 'pending' ? { submittedAt: 'asc' } : { updatedAt: 'desc' }, skip, take, include: { partner: { select: { id: true, businessName: true, user: { select: { fullName: true, phone: true } }, category: { select: { name: true } } } }, _count: { select: { documents: true } } } }),
      prisma.vehicle.count({ where }),
    ]);
    res.json({ success: true, data: await Promise.all(items.map(async (v) => ({ ...(await vehicles.serialize(v, { owner: true })), partner: v.partner, documentCount: v._count.documents }))), meta: pageMeta(page, limit, total) });
  }
);

router.get('/vehicles/:id', ANY, validate({ params: idParam }), async (req, res) => {
  const v = await prisma.vehicle.findUnique({ where: { id: req.params.id }, include: { documents: true, partner: { include: { user: { select: { id: true, fullName: true, phone: true } }, category: { include: { requirements: { where: { scope: 'vehicle' } } } } } } } });
  if (!v) throw notFound('Vehicle');
  const documents = await Promise.all(v.documents.map(async (d) => ({ ...d, frontUrl: await storage.url(d.frontKey, 600), backUrl: await storage.url(d.backKey, 600) })));
  const tripCount = await prisma.trip.count({ where: { vehicleId: v.id } });
  res.json({ success: true, data: { ...(await vehicles.serialize(v, { owner: true })), documents, requirements: v.partner.category.requirements, partner: { id: v.partner.id, businessName: v.partner.businessName, user: v.partner.user, category: v.partner.category.name }, tripCount } });
});

router.post('/vehicles/:id/review', MANAGER, validate({ params: idParam, body: decisionSchema }), async (req, res) => {
  const v = await prisma.vehicle.findUnique({ where: { id: req.params.id }, include: { documents: true, partner: { select: { userId: true } } } });
  if (!v) throw notFound('Vehicle');
  const { decision, reason, documents = [] } = req.body;
  if (decision === 'reject' && !reason) throw badRequest('Give a reason so the partner knows what to fix');
  await prisma.$transaction(async (tx) => {
    for (const d of documents) {
      if (!v.documents.find((x) => x.id === d.id)) continue;
      await tx.vehicleDocument.update({ where: { id: d.id }, data: { status: d.status, rejectionReason: d.status === 'rejected' ? d.reason || reason || 'Not acceptable' : null, reviewedAt: new Date() } });
    }
    if (decision === 'approve') await tx.vehicleDocument.updateMany({ where: { vehicleId: v.id, status: 'pending' }, data: { status: 'approved', reviewedAt: new Date() } });
    await tx.vehicle.update({ where: { id: v.id }, data: decision === 'approve' ? { verificationStatus: 'approved', verifiedAt: new Date(), verifiedBy: req.admin.id, rejectionReason: null } : { verificationStatus: 'rejected', rejectionReason: reason, rentalAvailable: false } });
  });
  await vehicles.clearPublicCache();
  await trips.clearSearchCache(); // a vehicle that lost approval takes its trips out of search
  await cache.del('admin:dashboard');
  notify.vehicleReviewed(v, v.partner.userId, decision === 'approve', reason);
  await audit(req, `vehicle.${decision}`, 'vehicle', v.id, req.body);
  res.json({ success: true, data: { verificationStatus: decision === 'approve' ? 'approved' : 'rejected' } });
});

router.post('/vehicles/:id/suspend', MANAGER, validate({ params: idParam, body: z.object({ reason: trimmed(500, 3) }) }), async (req, res) => {
  const v = await prisma.vehicle.findUnique({ where: { id: req.params.id }, include: { partner: { select: { userId: true } } } });
  if (!v) throw notFound('Vehicle');
  await prisma.vehicle.update({ where: { id: v.id }, data: { verificationStatus: 'suspended', rejectionReason: req.body.reason, rentalAvailable: false } });
  await prisma.trip.updateMany({ where: { vehicleId: v.id, status: 'scheduled' }, data: { bookingOpen: false } });
  await vehicles.clearPublicCache();
  await trips.clearSearchCache();
  notify.vehicleSuspended(v, v.partner.userId, req.body.reason);
  await audit(req, 'vehicle.suspend', 'vehicle', req.params.id, req.body);
  res.json({ success: true, data: { verificationStatus: 'suspended' } });
});

// ============================ REVIEWS ============================
router.get('/reviews', ANY, validate({ query: listQuery({ rating: z.coerce.number().int().min(1).max(5).optional(), hidden: z.enum(['true', 'false']).optional() }) }), async (req, res) => {
  const q = req.query;
  const { page, limit, skip, take } = paginate(q);
  const where = {
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.hidden ? { isHidden: q.hidden === 'true' } : {}),
    ...(q.q ? { OR: [{ comment: like(q.q) }, { partner: { user: { fullName: like(q.q) } } }, { user: { fullName: like(q.q) } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { id: true, fullName: true, phone: true } }, partner: { select: { id: true, businessName: true, user: { select: { fullName: true } } } }, booking: { select: { code: true, pickupName: true, dropName: true } } } }),
    prisma.review.count({ where }),
  ]);
  res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
});

router.post('/reviews/:id/visibility', MANAGER, validate({ params: idParam, body: z.object({ hidden: z.boolean() }) }), async (req, res) => {
  const r = await prisma.review.update({ where: { id: req.params.id }, data: { isHidden: req.body.hidden } }).catch(() => null);
  if (!r) throw notFound('Review');
  await reviews.refreshRating(r.partnerId);
  await audit(req, req.body.hidden ? 'review.hide' : 'review.show', 'review', r.id);
  res.json({ success: true, data: { id: r.id, isHidden: r.isHidden } });
});

// ============================ TRIPS & BOOKINGS ============================
router.get('/trips', ANY, validate({ query: listQuery({ status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(), type: z.enum(['start', 'return']).optional() }) }), async (req, res) => {
  const q = req.query;
  const { page, limit, skip, take } = paginate(q);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.type ? { tripType: q.type } : {}),
    ...(q.q ? { OR: [{ originName: like(q.q) }, { destinationName: like(q.q) }, { partner: { user: { fullName: like(q.q) } } }, { vehicle: { registrationNumber: { contains: q.q.toUpperCase() } } }] } : {}),
    ...(dateRange(q.from, q.to) ? { departureAt: dateRange(q.from, q.to) } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.trip.findMany({ where, orderBy: { departureAt: 'desc' }, skip, take, include: { vehicle: { select: { make: true, model: true, registrationNumber: true } }, partner: { select: { id: true, user: { select: { fullName: true, phone: true } } } }, _count: { select: { bookings: true, stops: true } } } }),
    prisma.trip.count({ where }),
  ]);
  res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
});

router.get('/trips/:id', ANY, validate({ params: idParam }), async (req, res) => {
  const t = await prisma.trip.findUnique({ where: { id: req.params.id }, include: { stops: { orderBy: { seq: 'asc' } }, vehicle: true, partner: { include: { user: { select: { fullName: true, phone: true } } } }, bookings: { orderBy: { createdAt: 'desc' } } } });
  if (!t) throw notFound('Trip');
  res.json({ success: true, data: t });
});

router.post('/trips/:id/cancel', MANAGER, validate({ params: idParam, body: z.object({ reason: trimmed(255, 3) }) }), async (req, res) => {
  const t = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!t) throw notFound('Trip');
  if (!['scheduled', 'ongoing'].includes(t.status)) throw badRequest('Trip is already closed');
  const affected = await prisma.booking.findMany({ where: { tripId: t.id, status: { in: ['pending', 'accepted'] } } });
  await prisma.$transaction([
    prisma.booking.updateMany({ where: { tripId: t.id, status: { in: ['pending', 'accepted'] } }, data: { status: 'cancelled', cancelledBy: 'admin', statusReason: req.body.reason } }),
    prisma.trip.update({ where: { id: t.id }, data: { status: 'cancelled', cancelReason: `Admin: ${req.body.reason}`, bookingOpen: false } }),
  ]);
  affected.forEach((b) => notify.bookingCancelledByPartner(b, req.body.reason));
  await audit(req, 'trip.cancel', 'trip', t.id, req.body);
  res.json({ success: true, data: { cancelled: true, bookingsCancelled: affected.length } });
});

router.get('/bookings', ANY, validate({ query: listQuery({ status: z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired']).optional(), tripId: z.coerce.number().int().optional() }) }), async (req, res) => {
  const q = req.query;
  const { page, limit, skip, take } = paginate(q);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.tripId ? { tripId: q.tripId } : {}),
    ...(q.q ? { OR: [{ code: { contains: q.q.toUpperCase() } }, { passengerName: like(q.q) }, { passengerPhone: { contains: q.q } }, { pickupName: like(q.q) }, { dropName: like(q.q) }] } : {}),
    ...(dateRange(q.from, q.to) ? { createdAt: dateRange(q.from, q.to) } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { trip: { select: { id: true, originName: true, destinationName: true, departureAt: true, tripType: true } }, partner: { select: { id: true, user: { select: { fullName: true, phone: true } } } } } }),
    prisma.booking.count({ where }),
  ]);
  res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
});

// ============================ PAYMENTS ============================
const paymentWhere = (q) => ({
  ...(q.status ? { status: q.status } : {}),
  ...(q.category ? { categoryCode: q.category } : {}),
  ...(q.q ? { OR: [{ receipt: { contains: q.q.toUpperCase() } }, { razorpayOrderId: { contains: q.q } }, { razorpayPaymentId: { contains: q.q } }, { user: { fullName: like(q.q) } }, { user: { phone: { contains: q.q } } }] } : {}),
  ...(dateRange(q.from, q.to) ? { createdAt: dateRange(q.from, q.to) } : {}),
});
const paymentQuery = listQuery({ status: z.enum(['created', 'paid', 'failed', 'refunded']).optional(), category: z.string().max(40).optional() });

router.get('/payments', ANY, validate({ query: paymentQuery }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = paymentWhere(req.query);
  const [items, total, sum] = await Promise.all([
    prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { id: true, fullName: true, phone: true } } } }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { ...where, status: 'paid' }, _sum: { amount: true } }),
  ]);
  res.json({ success: true, data: items.map((p) => ({ ...payments.serialize(p), user: p.user, partnerId: p.partnerId })), meta: { ...pageMeta(page, limit, total), paidTotal: sum._sum.amount || 0 } });
});

router.get('/payments/export.csv', MANAGER, validate({ query: paymentQuery }), async (req, res) => {
  const rows = await prisma.payment.findMany({ where: paymentWhere(req.query), orderBy: { createdAt: 'desc' }, take: 20000, include: { user: { select: { fullName: true, phone: true } } } });
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // CSV injection guard
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ['Receipt', 'Date', 'Partner', 'Phone', 'Category', 'Amount (INR)', 'Status', 'Method', 'Razorpay Order', 'Razorpay Payment', 'Paid At', 'Valid Until'];
  const lines = rows.map((p) => [p.receipt, p.createdAt.toISOString(), p.user.fullName, p.user.phone, p.categoryCode, (p.amount / 100).toFixed(2), p.status, p.method, p.razorpayOrderId, p.razorpayPaymentId, p.paidAt?.toISOString(), p.validUntil?.toISOString()].map(esc).join(','));
  await audit(req, 'payments.export', 'payment', null, { count: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="gotrip-payments-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send([header.join(','), ...lines].join('\n'));
});

router.get('/payments/:id', ANY, validate({ params: idParam }), async (req, res) => {
  const p = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { user: { select: { id: true, fullName: true, phone: true, email: true } } } });
  if (!p) throw notFound('Payment');
  const events = await prisma.paymentWebhookEvent.findMany({ where: { payload: { path: ['payload', 'payment', 'entity', 'order_id'], equals: p.razorpayOrderId } }, orderBy: { processedAt: 'asc' }, select: { eventId: true, event: true, processedAt: true } });
  res.json({ success: true, data: { ...payments.serialize(p), user: p.user, partnerId: p.partnerId, webhookEvents: events } });
});

router.post('/payments/:id/reconcile', MANAGER, validate({ params: idParam }), async (req, res) => {
  const p = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!p) throw notFound('Payment');
  const fresh = await payments.reconcile(p);
  await audit(req, 'payment.reconcile', 'payment', p.id, { before: p.status, after: fresh.status });
  res.json({ success: true, data: payments.serialize(fresh) });
});

// ============================ CATEGORIES & DOCUMENT REQUIREMENTS ============================
const asText = (max) => z.string().trim().max(max).optional().nullable();
const translationsOf = (shape) => z.object({ as: z.object(shape).partial() }).partial().optional().nullable();

const categoryBody = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{1,39}$/, 'Use lowercase letters, numbers and _'),
  name: trimmed(80),
  description: optText(255),
  icon: optText(50),
  registrationFee: money,
  feeValidityDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  hasDriverProfile: z.boolean().default(false),
  canListVehicles: z.boolean().default(false),
  canCreateTrips: z.boolean().default(false),
  canListRentals: z.boolean().default(false),
  canViewGoodsOrders: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  translations: translationsOf({ name: asText(80), description: asText(255) }),
});
const reqBody = z.object({
  scope: z.enum(['partner', 'vehicle']),
  docType: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{1,39}$/),
  label: trimmed(80),
  hint: optText(255),
  isRequired: z.boolean().default(true),
  requiresNumber: z.boolean().default(false),
  requiresExpiry: z.boolean().default(false),
  requiresBack: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  translations: translationsOf({ label: asText(80), hint: asText(255) }),
});

router.get('/categories', ANY, async (_req, res) => {
  const items = await prisma.partnerCategory.findMany({ orderBy: { sortOrder: 'asc' }, include: { requirements: { orderBy: [{ scope: 'asc' }, { sortOrder: 'asc' }] }, _count: { select: { partners: true } } } });
  res.json({ success: true, data: items });
});
router.post('/categories', SUPER, validate({ body: categoryBody }), async (req, res) => {
  const c = await prisma.partnerCategory.create({ data: req.body });
  await partnerService.clearCategoryCache();
  await audit(req, 'category.create', 'category', c.id, req.body);
  res.status(201).json({ success: true, data: c });
});
router.patch('/categories/:id', SUPER, validate({ params: idParam, body: categoryBody.partial().omit({ code: true }) }), async (req, res) => {
  const c = await prisma.partnerCategory.update({ where: { id: req.params.id }, data: req.body });
  await partnerService.clearCategoryCache();
  await audit(req, 'category.update', 'category', c.id, req.body);
  res.json({ success: true, data: c });
});
router.post('/categories/:id/requirements', SUPER, validate({ params: idParam, body: reqBody }), async (req, res) => {
  const r = await prisma.documentRequirement.create({ data: { ...req.body, categoryId: req.params.id } });
  await partnerService.clearCategoryCache();
  await audit(req, 'requirement.create', 'category', req.params.id, req.body);
  res.status(201).json({ success: true, data: r });
});
router.patch('/requirements/:id', SUPER, validate({ params: idParam, body: reqBody.partial().omit({ scope: true, docType: true }) }), async (req, res) => {
  const r = await prisma.documentRequirement.update({ where: { id: req.params.id }, data: req.body });
  await partnerService.clearCategoryCache();
  await audit(req, 'requirement.update', 'requirement', r.id, req.body);
  res.json({ success: true, data: r });
});
router.delete('/requirements/:id', SUPER, validate({ params: idParam }), async (req, res) => {
  await prisma.documentRequirement.delete({ where: { id: req.params.id } });
  await partnerService.clearCategoryCache();
  await audit(req, 'requirement.delete', 'requirement', req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

// ============================ SETTINGS ============================
router.get('/settings', ANY, async (_req, res) => res.json({ success: true, data: await settings.all() }));
router.patch(
  '/settings',
  SUPER,
  validate({
    body: z
      .object({
        goods_orders_enabled: z.boolean(),
        driver_listing_requires_approval: z.boolean(),
        sms_booking_alerts: z.boolean(),
        booking_request_expiry_minutes: z.coerce.number().int().min(0).max(10080),
        location_share_max_hours: z.coerce.number().min(1).max(24),
        support_phone: z.string().trim().max(20),
        support_email: z.string().trim().email(),
        min_app_version_user: z.string().regex(/^\d+\.\d+\.\d+$/),
        min_app_version_partner: z.string().regex(/^\d+\.\d+\.\d+$/),
      })
      .partial(),
  }),
  async (req, res) => {
    const data = await settings.update(req.body);
    if ('driver_listing_requires_approval' in req.body) {
      // Re-evaluate every driver listing with the new rule.
      const ids = await prisma.driverProfile.findMany({ select: { partnerId: true } });
      for (const { partnerId } of ids) await partnerService.syncDriverListing(partnerId);
    }
    await audit(req, 'settings.update', 'settings', null, req.body);
    res.json({ success: true, data });
  }
);

// ============================ SUPPORT & FAQ ============================
router.get('/tickets', ANY, validate({ query: listQuery({ status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(), app: z.enum(['user', 'partner']).optional() }) }), async (req, res) => {
  const q = req.query;
  const { page, limit, skip, take } = paginate(q);
  const where = { ...(q.status ? { status: q.status } : {}), ...(q.app ? { app: q.app } : {}), ...(q.q ? { OR: [{ subject: like(q.q) }, { message: like(q.q) }, { user: { phone: { contains: q.q } } }] } : {}) };
  const [items, total] = await Promise.all([prisma.supportTicket.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { id: true, fullName: true, phone: true } } } }), prisma.supportTicket.count({ where })]);
  res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
});
router.patch('/tickets/:id', ANY, validate({ params: idParam, body: z.object({ status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(), adminReply: optText(2000) }) }), async (req, res) => {
  const t = await prisma.supportTicket.update({ where: { id: req.params.id }, data: { ...req.body, ...(req.body.adminReply ? { repliedAt: new Date() } : {}) } });
  if (req.body.adminReply) notify.ticketReplied(t);
  await audit(req, 'ticket.update', 'ticket', t.id, req.body);
  res.json({ success: true, data: t });
});

const faqBody = z.object({ audience: z.enum(['all', 'user', 'partner']).default('all'), question: trimmed(300, 5), answer: trimmed(2000, 5), sortOrder: z.coerce.number().int().default(0), isActive: z.boolean().default(true), translations: translationsOf({ question: asText(300), answer: asText(2000) }) });
router.get('/faqs', ANY, async (_req, res) => res.json({ success: true, data: await prisma.faq.findMany({ orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }] }) }));
router.post('/faqs', MANAGER, validate({ body: faqBody }), async (req, res) => {
  const f = await prisma.faq.create({ data: req.body });
  await cache.delPrefix('catalog:faqs');
  res.status(201).json({ success: true, data: f });
});
router.patch('/faqs/:id', MANAGER, validate({ params: idParam, body: faqBody.partial() }), async (req, res) => {
  const f = await prisma.faq.update({ where: { id: req.params.id }, data: req.body });
  await cache.delPrefix('catalog:faqs');
  res.json({ success: true, data: f });
});
router.delete('/faqs/:id', MANAGER, validate({ params: idParam }), async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } });
  await cache.delPrefix('catalog:faqs');
  res.json({ success: true, data: { deleted: true } });
});

// ============================ LOCATIONS ============================
router.get('/locations', ANY, async (_req, res) => {
  res.json({ success: true, data: await prisma.district.findMany({ orderBy: { name: 'asc' }, include: { places: { orderBy: { name: 'asc' } } } }) });
});
router.post('/locations/districts', MANAGER, validate({ body: z.object({ name: trimmed(80, 2), state: trimmed(60).default('Assam') }) }), async (req, res) => {
  const d = await prisma.district.create({ data: req.body });
  await cache.delPrefix('catalog:');
  res.status(201).json({ success: true, data: d });
});
router.patch('/locations/districts/:id', MANAGER, validate({ params: idParam, body: z.object({ name: trimmed(80, 2).optional(), isActive: z.boolean().optional() }) }), async (req, res) => {
  const d = await prisma.district.update({ where: { id: req.params.id }, data: req.body });
  await cache.delPrefix('catalog:');
  res.json({ success: true, data: d });
});
router.post('/locations/places', MANAGER, validate({ body: z.object({ districtId: z.number().int(), name: trimmed(120, 2), lat: z.number().optional().nullable(), lng: z.number().optional().nullable() }) }), async (req, res) => {
  const p = await prisma.place.create({ data: { ...req.body, nameKey: placeKey(req.body.name) } });
  await cache.delPrefix('catalog:');
  res.status(201).json({ success: true, data: p });
});
router.patch('/locations/places/:id', MANAGER, validate({ params: idParam, body: z.object({ name: trimmed(120, 2).optional(), lat: z.number().optional().nullable(), lng: z.number().optional().nullable(), isActive: z.boolean().optional() }) }), async (req, res) => {
  const p = await prisma.place.update({ where: { id: req.params.id }, data: { ...req.body, ...(req.body.name ? { nameKey: placeKey(req.body.name) } : {}) } });
  await cache.delPrefix('catalog:');
  res.json({ success: true, data: p });
});

// ============================ GOODS ORDERS (read-only while disabled) ============================
router.get('/goods-orders', ANY, validate({ query: listQuery({ status: z.enum(['open', 'assigned', 'closed', 'cancelled']).optional() }) }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = req.query.status ? { status: req.query.status } : {};
  const [items, total] = await Promise.all([prisma.goodsOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { fullName: true, phone: true } } } }), prisma.goodsOrder.count({ where })]);
  res.json({ success: true, data: items, meta: { ...pageMeta(page, limit, total), featureEnabled: !!(await settings.get('goods_orders_enabled')) } });
});

// ============================ ADMIN USERS & AUDIT ============================
router.get('/admins', SUPER, async (_req, res) => {
  res.json({ success: true, data: await prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } }) });
});
router.post('/admins', SUPER, validate({ body: z.object({ email: z.string().trim().toLowerCase().email(), name: trimmed(100), role: z.enum(['super_admin', 'admin', 'support']), password: z.string().min(10).max(200) }) }), async (req, res) => {
  const { password, ...rest } = req.body;
  const a = await prisma.adminUser.create({ data: { ...rest, passwordHash: await bcrypt.hash(password, 12) }, select: { id: true, email: true, name: true, role: true, isActive: true } });
  await audit(req, 'admin.create', 'admin', a.id, rest);
  res.status(201).json({ success: true, data: a });
});
router.patch('/admins/:id', SUPER, validate({ params: idParam, body: z.object({ name: trimmed(100).optional(), role: z.enum(['super_admin', 'admin', 'support']).optional(), isActive: z.boolean().optional(), password: z.string().min(10).max(200).optional() }) }), async (req, res) => {
  if (req.params.id === req.admin.id && (req.body.isActive === false || (req.body.role && req.body.role !== 'super_admin'))) throw forbidden('You cannot deactivate or demote yourself');
  const { password, ...rest } = req.body;
  const a = await prisma.adminUser.update({
    where: { id: req.params.id },
    data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}), tokenVersion: { increment: 1 } },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  await cache.del(`auth:admin:${a.id}`);
  await audit(req, 'admin.update', 'admin', a.id, rest);
  res.json({ success: true, data: a });
});

router.get('/audit-logs', SUPER, validate({ query: listQuery({ entityType: z.string().max(40).optional() }) }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = { ...(req.query.entityType ? { entityType: req.query.entityType } : {}), ...(req.query.q ? { action: like(req.query.q) } : {}) };
  const [items, total] = await Promise.all([prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { admin: { select: { name: true, email: true } } } }), prisma.auditLog.count({ where })]);
  res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
});

module.exports = router;
