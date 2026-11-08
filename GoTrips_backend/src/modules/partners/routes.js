'use strict';
const express = require('express');
const prisma = require('../../lib/prisma');
const storage = require('../../services/storage');
const settings = require('../../services/settings');
const service = require('./service');
const { validate, z, trimmed, optText, strList, lat, lng, money, boolish } = require('../../lib/validate');
const { authenticate, requirePartner, requireActivePartner, invalidateAuthCache } = require('../../middleware/auth');
const { documentUpload } = require('../../middleware/upload');
const { writeLimiter } = require('../../middleware/rateLimit');
const { badRequest, notFound, conflict } = require('../../lib/errors');
const { normalizePhone, paginate, pageMeta, startOfDay } = require('../../lib/util');

const router = express.Router();
router.use(authenticate);

const optPhone = z
  .string()
  .trim()
  .max(16)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    try {
      return normalizePhone(v);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
      return z.NEVER;
    }
  });

const detailsSchema = z.object({
  businessName: optText(120),
  alternatePhone: optPhone,
  whatsappPhone: optPhone,
  address: optText(255),
  district: trimmed(80).optional(),
  city: trimmed(80).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code').optional().nullable(),
});

async function serializePartner(p) {
  const category = await service.categoryById(p.categoryId);
  return {
    id: p.id,
    category: { code: category.code, name: category.name },
    businessName: p.businessName,
    alternatePhone: p.alternatePhone,
    whatsappPhone: p.whatsappPhone,
    address: p.address,
    district: p.district,
    city: p.city,
    pincode: p.pincode,
    accountStatus: p.accountStatus,
    verificationStatus: p.verificationStatus,
    rejectionReason: p.rejectionReason,
    feePaidAt: p.feePaidAt,
    listingExpiresAt: p.listingExpiresAt,
    activatedAt: p.activatedAt,
    createdAt: p.createdAt,
  };
}

// ---------- Onboarding ----------

router.get('/onboarding', async (req, res) => {
  res.json({ success: true, data: await service.onboardingState(req.user.id) });
});

/** Start (or switch category during onboarding). */
router.post(
  '/register',
  validate({ body: detailsSchema.extend({ categoryCode: trimmed(40), fullName: trimmed(100, 2).optional(), email: z.string().trim().toLowerCase().email().max(150).optional().nullable() }) }),
  async (req, res) => {
    const { categoryCode, fullName, email, ...details } = req.body;
    const category = await service.categoryByCode(categoryCode);
    if (!category) throw badRequest('Unknown partner type');

    if (fullName || email !== undefined) await prisma.user.update({ where: { id: req.user.id }, data: { ...(fullName ? { fullName } : {}), ...(email !== undefined ? { email } : {}) } });

    const existing = await prisma.partner.findUnique({ where: { userId: req.user.id } });
    if (existing) {
      if (existing.categoryId !== category.id && (existing.accountStatus !== 'onboarding' || existing.feePaidAt)) throw conflict('Your partner type cannot be changed after registration. Contact support.');
      await prisma.partner.update({ where: { id: existing.id }, data: { ...details, categoryId: category.id } });
    } else {
      await prisma.partner.create({ data: { ...details, userId: req.user.id, categoryId: category.id } });
    }
    const partner = await prisma.partner.findUnique({ where: { userId: req.user.id } });
    if (category.hasDriverProfile) await prisma.driverProfile.upsert({ where: { partnerId: partner.id }, create: { partnerId: partner.id, district: partner.district, city: partner.city }, update: {} });
    await invalidateAuthCache(req.user.id);
    res.status(existing ? 200 : 201).json({ success: true, data: await service.tryComplete(req.user.id) });
  }
);

// ---------- Profile ----------

router.get('/me', requirePartner, async (req, res) => {
  const p = await prisma.partner.findUnique({ where: { id: req.partner.id } });
  res.json({ success: true, data: await serializePartner(p) });
});

router.patch('/me', requirePartner, validate({ body: detailsSchema }), async (req, res) => {
  const p = await prisma.partner.update({ where: { id: req.partner.id }, data: req.body });
  await service.tryComplete(req.user.id);
  res.json({ success: true, data: await serializePartner(p) });
});

// ---------- Documents ----------

async function serializeDoc(d) {
  return { id: d.id, docType: d.docType, docNumber: d.docNumber, expiryDate: d.expiryDate, status: d.status, rejectionReason: d.rejectionReason, frontUrl: await storage.url(d.frontKey, 900), backUrl: await storage.url(d.backKey, 900), updatedAt: d.updatedAt };
}

router.get('/documents', requirePartner, async (req, res) => {
  const category = await service.categoryById(req.partner.category.id);
  const docs = await prisma.partnerDocument.findMany({ where: { partnerId: req.partner.id } });
  const byType = Object.fromEntries(docs.map((d) => [d.docType, d]));
  const items = await Promise.all(
    category.requirements
      .filter((r) => r.scope === 'partner')
      .map(async (r) => ({ requirement: { docType: r.docType, label: r.label, hint: r.hint, isRequired: r.isRequired, requiresNumber: r.requiresNumber, requiresExpiry: r.requiresExpiry, requiresBack: r.requiresBack }, document: byType[r.docType] ? await serializeDoc(byType[r.docType]) : null }))
  );
  res.json({ success: true, data: items });
});

router.post(
  '/documents/:docType',
  requirePartner,
  writeLimiter,
  documentUpload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  validate({ params: z.object({ docType: z.string().max(40) }), body: z.object({ docNumber: optText(60), expiryDate: z.coerce.date().optional().nullable() }) }),
  async (req, res) => {
    const category = await service.categoryById(req.partner.category.id);
    const reqm = category.requirements.find((r) => r.scope === 'partner' && r.docType === req.params.docType);
    if (!reqm) throw badRequest('This document is not needed for your partner type');
    const front = req.files?.front?.[0];
    const back = req.files?.back?.[0];
    const existing = await prisma.partnerDocument.findUnique({ where: { partnerId_docType: { partnerId: req.partner.id, docType: reqm.docType } } });
    if (!front && !existing) throw badRequest('Please upload a photo of the document');
    if (reqm.requiresNumber && !req.body.docNumber && !existing?.docNumber) throw badRequest(`Enter the ${reqm.label} number`);
    if (reqm.requiresExpiry) {
      const exp = req.body.expiryDate || existing?.expiryDate;
      if (!exp) throw badRequest(`Enter the ${reqm.label} expiry date`);
      if (new Date(exp) < startOfDay()) throw badRequest(`${reqm.label} has expired. Please upload a valid document.`);
    }
    if (reqm.requiresBack && !back && !existing?.backKey) throw badRequest(`Upload the back side of the ${reqm.label}`);

    const frontKey = front ? await storage.save(front, `docs/partner/${req.partner.id}`, { allowPdf: true }) : existing.frontKey;
    const backKey = back ? await storage.save(back, `docs/partner/${req.partner.id}`, { allowPdf: true }) : existing?.backKey || null;
    const data = { frontKey, backKey, docNumber: req.body.docNumber ?? existing?.docNumber ?? null, expiryDate: req.body.expiryDate ?? existing?.expiryDate ?? null, status: 'pending', rejectionReason: null, reviewedAt: null, reviewedBy: null };
    const doc = await prisma.partnerDocument.upsert({ where: { partnerId_docType: { partnerId: req.partner.id, docType: reqm.docType } }, create: { ...data, partnerId: req.partner.id, docType: reqm.docType }, update: data });
    if (existing && front && existing.frontKey !== frontKey) storage.remove(existing.frontKey);
    if (existing && back && existing.backKey && existing.backKey !== backKey) storage.remove(existing.backKey);

    // A re-upload after approval/rejection sends the partner back to the admin review queue.
    if (req.partner.accountStatus === 'active' && req.partner.verificationStatus !== 'pending') {
      await prisma.partner.update({ where: { id: req.partner.id }, data: { verificationStatus: 'pending', submittedAt: new Date() } });
      await invalidateAuthCache(req.user.id);
    }
    const onboarding = await service.tryComplete(req.user.id);
    res.json({ success: true, data: { document: await serializeDoc(doc), onboarding } });
  }
);

// ---------- Driver marketplace profile ----------

const driverSchema = z.object({
  headline: optText(120),
  bio: optText(1000),
  hasPriorExperience: z.boolean().optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  experienceDetails: optText(1000),
  licenseNumber: optText(40),
  licenseTypes: strList(8, 20).optional(),
  licenseExpiry: z.coerce.date().optional().nullable(),
  vehicleTypes: strList(15, 30).optional(),
  canDriveAutomatic: z.boolean().optional(),
  languages: strList(10, 30).optional(),
  serviceAreas: strList(20, 80).optional(),
  workTypes: strList(10, 30).optional(),
  availability: z.enum(['full_time', 'part_time', 'on_call']).optional().nullable(),
  expectedPayMin: money.optional().nullable(),
  expectedPayMax: money.optional().nullable(),
  payUnit: z.enum(['per_day', 'per_month', 'per_trip', 'per_hour']).optional().nullable(),
  education: optText(80),
  hasOwnVehicle: z.boolean().optional(),
  district: trimmed(80).optional(),
  city: optText(80),
  lat: lat.optional().nullable(),
  lng: lng.optional().nullable(),
  isAvailable: z.boolean().optional(),
});

const requireDriverCategory = (req, _res, next) => {
  if (!req.partner.category.hasDriverProfile) throw badRequest('A driver profile is only available for driver partners');
  next();
};

router.get('/driver-profile', requirePartner, requireDriverCategory, async (req, res) => {
  const profile = await prisma.driverProfile.upsert({ where: { partnerId: req.partner.id }, create: { partnerId: req.partner.id }, update: {} });
  res.json({ success: true, data: profile });
});

router.put('/driver-profile', requirePartner, requireDriverCategory, validate({ body: driverSchema }), async (req, res) => {
  const b = req.body;
  if (b.expectedPayMin != null && b.expectedPayMax != null && b.expectedPayMax < b.expectedPayMin) throw badRequest('Maximum pay must be more than minimum pay');
  if (b.hasPriorExperience === false) b.experienceYears = 0;
  if (b.licenseExpiry && b.licenseExpiry < startOfDay()) throw badRequest('Your driving licence has expired');
  await prisma.driverProfile.upsert({ where: { partnerId: req.partner.id }, create: { ...b, partnerId: req.partner.id }, update: b });
  // Keep partner location in sync for the onboarding "details" step.
  if (b.district || b.city) {
    const p = await prisma.partner.findUnique({ where: { id: req.partner.id }, select: { district: true, city: true } });
    await prisma.partner.update({ where: { id: req.partner.id }, data: { district: p.district || b.district, city: p.city || b.city || b.district } });
  }
  const onboarding = await service.tryComplete(req.user.id);
  const profile = await prisma.driverProfile.findUnique({ where: { partnerId: req.partner.id } });
  res.json({ success: true, data: { profile, onboarding } });
});

// ---------- Dashboard ----------

const sumFare = (rows, statuses) => rows.filter((r) => statuses.includes(r.status)).reduce((a, r) => a + (r._sum.fareEstimate || 0), 0);
const countOf = (rows, status) => rows.find((r) => r.status === status)?._count._all || 0;

router.get('/dashboard', requireActivePartner, async (req, res) => {
  const pid = req.partner.id;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [vehicleGroups, vehicleActive, bookingGroups, monthGroups, upcomingTrips, ongoingTrips, completedTrips, rentalListed, calls30, profile, pendingRequests] = await Promise.all([
    prisma.vehicle.groupBy({ by: ['verificationStatus'], where: { partnerId: pid }, _count: { _all: true } }),
    prisma.vehicle.count({ where: { partnerId: pid, verificationStatus: 'approved', isAvailable: true } }),
    prisma.booking.groupBy({ by: ['status'], where: { partnerId: pid }, _count: { _all: true }, _sum: { fareEstimate: true } }),
    prisma.booking.groupBy({ by: ['status'], where: { partnerId: pid, createdAt: { gte: monthStart } }, _count: { _all: true }, _sum: { fareEstimate: true } }),
    prisma.trip.count({ where: { partnerId: pid, status: 'scheduled', departureAt: { gte: new Date() } } }),
    prisma.trip.count({ where: { partnerId: pid, status: 'ongoing' } }),
    prisma.trip.count({ where: { partnerId: pid, status: 'completed' } }),
    prisma.vehicle.count({ where: { partnerId: pid, forRental: true, verificationStatus: 'approved', rentalAvailable: true } }),
    prisma.contactEvent.count({ where: { partnerId: pid, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
    req.partner.category.hasDriverProfile ? prisma.driverProfile.findUnique({ where: { partnerId: pid }, select: { isListed: true, viewCount: true, callCount: true, completeness: true, isAvailable: true } }) : null,
    prisma.booking.findMany({ where: { partnerId: pid, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 5, include: { trip: { select: { departureAt: true, originName: true, destinationName: true } } } }),
  ]);
  const totalVehicles = vehicleGroups.reduce((a, g) => a + g._count._all, 0);
  const vstat = (s) => vehicleGroups.find((g) => g.verificationStatus === s)?._count._all || 0;
  const onboarding = await service.onboardingState(req.user.id);

  res.json({
    success: true,
    data: {
      partner: { category: req.partner.category, verificationStatus: req.partner.verificationStatus, listingExpiresAt: req.partner.listingExpiresAt },
      pendingSteps: onboarding.steps.filter((s) => !s.done),
      vehicles: { total: totalVehicles, approved: vstat('approved'), pending: vstat('pending'), rejected: vstat('rejected'), active: vehicleActive, inactive: totalVehicles - vehicleActive, rentalListed },
      bookings: {
        total: bookingGroups.reduce((a, g) => a + g._count._all, 0),
        pending: countOf(bookingGroups, 'pending'),
        accepted: countOf(bookingGroups, 'accepted'),
        completed: countOf(bookingGroups, 'completed'),
        rejected: countOf(bookingGroups, 'rejected'),
        cancelled: countOf(bookingGroups, 'cancelled'),
      },
      trips: { upcoming: upcomingTrips, ongoing: ongoingTrips, completed: completedTrips },
      earnings: {
        note: 'Estimated from booking fares. GoTrip does not collect or pay out trip money.',
        totalEstimated: sumFare(bookingGroups, ['completed']),
        upcomingEstimated: sumFare(bookingGroups, ['accepted']),
        thisMonthEstimated: sumFare(monthGroups, ['completed', 'accepted']),
      },
      contacts: { callsLast30Days: calls30 },
      driverProfile: profile,
      pendingRequests: pendingRequests.map((b) => ({ id: b.id, code: b.code, seats: b.seats, pickupName: b.pickupName, dropName: b.dropName, passengerName: b.passengerName, fareEstimate: b.fareEstimate, departureAt: b.trip.departureAt, createdAt: b.createdAt })),
    },
  });
});

// ---------- Earnings (estimated) ----------

router.get('/earnings', requireActivePartner, validate({ query: z.object({ period: z.enum(['week', 'month', 'year', 'all']).default('month'), page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(50).optional() }) }), async (req, res) => {
  const pid = req.partner.id;
  const { period } = req.query;
  const now = new Date();
  const from = period === 'week' ? new Date(now - 7 * 86400_000) : period === 'month' ? new Date(now - 30 * 86400_000) : period === 'year' ? new Date(now - 365 * 86400_000) : new Date(0);
  const bucket = period === 'year' || period === 'all' ? 'month' : 'day';
  const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 20, maxLimit: 50 });
  const where = { partnerId: pid, status: { in: ['completed', 'accepted'] }, createdAt: { gte: from } };

  const [series, totals, history, historyTotal, byVehicle] = await Promise.all([
    prisma.$queryRaw`
      SELECT date_trunc(${bucket}, b.created_at AT TIME ZONE 'Asia/Kolkata') AS bucket,
             COALESCE(SUM(b.fare_estimate) FILTER (WHERE b.status = 'completed'), 0)::int AS earned,
             COALESCE(SUM(b.fare_estimate) FILTER (WHERE b.status = 'accepted'), 0)::int AS upcoming,
             COUNT(*)::int AS bookings
      FROM bookings b
      WHERE b.partner_id = ${pid} AND b.status IN ('completed','accepted') AND b.created_at >= ${from}
      GROUP BY 1 ORDER BY 1`,
    prisma.booking.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { fareEstimate: true, seats: true } }),
    prisma.booking.findMany({ where: { partnerId: pid }, orderBy: { createdAt: 'desc' }, skip, take, include: { trip: { select: { departureAt: true, tripType: true, vehicle: { select: { make: true, model: true, registrationNumber: true } } } } } }),
    prisma.booking.count({ where: { partnerId: pid } }),
    prisma.$queryRaw`
      SELECT v.id, v.make, v.model, v.registration_number AS "registrationNumber",
             COUNT(b.id)::int AS bookings, COALESCE(SUM(b.fare_estimate), 0)::int AS estimated
      FROM vehicles v
      LEFT JOIN trips t ON t.vehicle_id = v.id
      LEFT JOIN bookings b ON b.trip_id = t.id AND b.status IN ('completed','accepted') AND b.created_at >= ${from}
      WHERE v.partner_id = ${pid}
      GROUP BY v.id ORDER BY estimated DESC LIMIT 20`,
  ]);

  res.json({
    success: true,
    data: {
      period,
      note: 'Estimated from booking fares. GoTrip does not collect or pay out trip money.',
      summary: {
        earned: sumFare(totals, ['completed']),
        upcoming: sumFare(totals, ['accepted']),
        completedBookings: countOf(totals, 'completed'),
        acceptedBookings: countOf(totals, 'accepted'),
        seatsSold: totals.reduce((a, t) => a + (t._sum.seats || 0), 0),
      },
      series,
      byVehicle,
      history: history.map((b) => ({ id: b.id, code: b.code, status: b.status, seats: b.seats, pickupName: b.pickupName, dropName: b.dropName, fareEstimate: b.fareEstimate, passengerName: b.passengerName, departureAt: b.trip.departureAt, tripType: b.trip.tripType, vehicle: b.trip.vehicle, createdAt: b.createdAt })),
    },
    meta: pageMeta(page, limit, historyTotal),
  });
});

// ---------- Live location sharing ----------
// Only the latest point is stored, so there is no history table, no paid tracking service and almost no DB load.
// Customers open the point in Google Maps through a normal maps URL, which costs nothing.

router.get('/location', requireActivePartner, async (req, res) => {
  res.json({ success: true, data: await prisma.locationShare.findUnique({ where: { partnerId: req.partner.id } }) });
});

router.post('/location/start', requireActivePartner, validate({ body: z.object({ tripId: z.number().int().positive().optional().nullable(), hours: z.number().min(0.5).max(24).default(4), lat: lat.optional(), lng: lng.optional() }) }), async (req, res) => {
  const max = Number(await settings.get('location_share_max_hours')) || 12;
  const hours = Math.min(req.body.hours, max);
  if (req.body.tripId) {
    const trip = await prisma.trip.findFirst({ where: { id: req.body.tripId, partnerId: req.partner.id }, select: { id: true } });
    if (!trip) throw notFound('Trip');
  }
  const data = { isSharing: true, tripId: req.body.tripId || null, startedAt: new Date(), expiresAt: new Date(Date.now() + hours * 3600_000), ...(req.body.lat != null ? { lat: req.body.lat, lng: req.body.lng } : {}) };
  const share = await prisma.locationShare.upsert({ where: { partnerId: req.partner.id }, create: { ...data, partnerId: req.partner.id }, update: data });
  res.json({ success: true, data: share });
});

router.post('/location', requireActivePartner, validate({ body: z.object({ lat, lng, accuracy: z.number().min(0).max(10000).optional() }) }), async (req, res) => {
  const share = await prisma.locationShare.findUnique({ where: { partnerId: req.partner.id } });
  if (!share?.isSharing || (share.expiresAt && share.expiresAt < new Date())) {
    if (share?.isSharing) await prisma.locationShare.update({ where: { partnerId: req.partner.id }, data: { isSharing: false } });
    return res.json({ success: true, data: { isSharing: false } });
  }
  // Ignore updates more often than every 10s to protect the DB from chatty clients.
  if (share.updatedAt && Date.now() - share.updatedAt.getTime() < 10_000) return res.json({ success: true, data: { isSharing: true, throttled: true } });
  await prisma.locationShare.update({ where: { partnerId: req.partner.id }, data: { lat: req.body.lat, lng: req.body.lng, accuracyM: req.body.accuracy } });
  res.json({ success: true, data: { isSharing: true, expiresAt: share.expiresAt } });
});

router.post('/location/stop', requireActivePartner, async (req, res) => {
  await prisma.locationShare.updateMany({ where: { partnerId: req.partner.id }, data: { isSharing: false } });
  res.json({ success: true, data: { isSharing: false } });
});

module.exports = router;
