'use strict';
const express = require('express');
const prisma = require('../lib/prisma');
const storage = require('../services/storage');
const { validate, z, idParam, optText, trimmed, lat, lng, pageQuery } = require('../lib/validate');
const { authenticate, invalidateAuthCache } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { notFound, badRequest } = require('../lib/errors');
const { paginate, pageMeta } = require('../lib/util');
const { writeLimiter } = require('../middleware/rateLimit');
const { langOf } = require('../lib/i18n');
const notify = require('../services/notify');
const cache = require('../lib/cache');
const messages = require('../services/messages');

/** Show stored notifications in the language the user reads the app in now, not the one at send time. */
function localNotification(n, lang) {
  const { _k: key, _v: vars, ...data } = n.data || {};
  let { title, body } = n;
  if (key && messages.has(key)) {
    try {
      ({ title, body } = messages.render(key, lang, vars));
    } catch {
      /* keep the stored text */
    }
  }
  return { ...n, title, body, data };
}

async function serializeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    phone: u.phone,
    fullName: u.fullName,
    email: u.email,
    gender: u.gender,
    dateOfBirth: u.dateOfBirth,
    city: u.city,
    language: u.language,
    photoUrl: await storage.url(u.photoKey),
    status: u.status,
    createdAt: u.createdAt,
  };
}

const router = express.Router();
router.use(authenticate);

// ---- Profile ----
router.get('/', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ success: true, data: await serializeUser(user) });
});

router.patch(
  '/',
  validate({
    body: z.object({
      fullName: trimmed(100, 2).optional(),
      email: z.string().trim().toLowerCase().email().max(150).optional().nullable(),
      gender: z.enum(['male', 'female', 'other']).optional().nullable(),
      dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future').optional().nullable(),
      city: optText(80),
      language: z.enum(['en', 'as']).optional(),
    }),
  }),
  async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
    await invalidateAuthCache(req.user.id);
    res.json({ success: true, data: await serializeUser(user) });
  }
);

router.post('/photo', writeLimiter, imageUpload.single('photo'), async (req, res) => {
  if (!req.file) throw badRequest('Choose a photo to upload');
  const key = await storage.save(req.file, 'profile');
  const prev = await prisma.user.findUnique({ where: { id: req.user.id }, select: { photoKey: true } });
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { photoKey: key } });
  if (prev?.photoKey) storage.remove(prev.photoKey);
  res.json({ success: true, data: await serializeUser(user) });
});

/** Account deletion (required by Play Store / App Store). Personal data is anonymised, records kept for accounting. */
router.delete('/', async (req, res) => {
  const id = req.user.id;
  let affected = [];
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { phone: `+0${String(id).padStart(13, '0')}`.slice(0, 15), fullName: 'Deleted user', email: null, photoKey: null, status: 'blocked', blockReason: 'Account deleted by user' } });
    await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.pushToken.deleteMany({ where: { userId: id } });
    await tx.savedPlace.deleteMany({ where: { userId: id } });
    await tx.booking.updateMany({ where: { userId: id, status: 'pending' }, data: { status: 'cancelled', cancelledBy: 'user', statusReason: 'Account deleted' } });
    const partner = await tx.partner.findUnique({ where: { userId: id }, select: { id: true } });
    if (partner) {
      await tx.partner.update({ where: { id: partner.id }, data: { accountStatus: 'suspended', suspendedReason: 'Account deleted by user' } });
      await tx.driverProfile.updateMany({ where: { partnerId: partner.id }, data: { isListed: false } });
      await tx.vehicle.updateMany({ where: { partnerId: partner.id }, data: { isAvailable: false, rentalAvailable: false } });
      // Passengers holding or waiting for seats on this partner's upcoming trips must be told.
      affected = await tx.booking.findMany({ where: { partnerId: partner.id, status: { in: ['pending', 'accepted'] }, trip: { status: 'scheduled' } } });
      await tx.booking.updateMany({ where: { id: { in: affected.map((b) => b.id) } }, data: { status: 'cancelled', cancelledBy: 'partner', statusReason: 'Partner account closed' } });
      await tx.trip.updateMany({ where: { partnerId: partner.id, status: 'scheduled' }, data: { status: 'cancelled', cancelReason: 'Partner account closed', bookingOpen: false } });
    }
  });
  affected.forEach((b) => notify.bookingCancelledByPartner(b, 'Partner account closed'));
  if (affected.length) await cache.delPrefix('trips:search:');
  await invalidateAuthCache(id);
  res.json({ success: true, data: { deleted: true } });
});

// ---- Push tokens ----
router.post(
  '/push-tokens',
  validate({ body: z.object({ token: z.string().min(10).max(255), platform: z.enum(['android', 'ios', 'web']), app: z.enum(['user', 'partner']) }) }),
  async (req, res) => {
    const { token, platform, app } = req.body;
    await prisma.pushToken.upsert({ where: { token }, create: { token, platform, app, userId: req.user.id }, update: { userId: req.user.id, platform, app, isActive: true } });
    res.json({ success: true, data: { registered: true } });
  }
);

router.delete('/push-tokens', validate({ body: z.object({ token: z.string().min(10).max(255) }) }), async (req, res) => {
  await prisma.pushToken.updateMany({ where: { token: req.body.token, userId: req.user.id }, data: { isActive: false } });
  res.json({ success: true, data: { removed: true } });
});

// ---- Notifications ----
const appQuery = z.object({ app: z.enum(['user', 'partner']).default('user'), ...pageQuery });

router.get('/notifications', validate({ query: appQuery }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = { userId: req.user.id, app: req.query.app };
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);
  const lang = langOf(req);
  res.json({ success: true, data: items.map((n) => localNotification(n, lang)), meta: { ...pageMeta(page, limit, total), unread } });
});

router.get('/notifications/unread-count', validate({ query: appQuery }), async (req, res) => {
  const unread = await prisma.notification.count({ where: { userId: req.user.id, app: req.query.app, readAt: null } });
  res.json({ success: true, data: { unread } });
});

router.post('/notifications/read', validate({ body: z.object({ app: z.enum(['user', 'partner']).default('user'), ids: z.array(z.number().int()).max(200).optional() }) }), async (req, res) => {
  const where = { userId: req.user.id, app: req.body.app, readAt: null, ...(req.body.ids ? { id: { in: req.body.ids } } : {}) };
  const r = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
  res.json({ success: true, data: { updated: r.count } });
});

// ---- Saved places ----
const placeBody = z.object({ label: trimmed(50), address: trimmed(255), lat: lat.optional().nullable(), lng: lng.optional().nullable() });

router.get('/saved-places', async (req, res) => {
  res.json({ success: true, data: await prisma.savedPlace.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }) });
});
router.post('/saved-places', validate({ body: placeBody }), async (req, res) => {
  const count = await prisma.savedPlace.count({ where: { userId: req.user.id } });
  if (count >= 20) throw badRequest('You can save up to 20 places');
  res.status(201).json({ success: true, data: await prisma.savedPlace.create({ data: { ...req.body, userId: req.user.id } }) });
});
router.put('/saved-places/:id', validate({ params: idParam, body: placeBody }), async (req, res) => {
  const r = await prisma.savedPlace.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: req.body });
  if (!r.count) throw notFound('Place');
  res.json({ success: true, data: await prisma.savedPlace.findUnique({ where: { id: req.params.id } }) });
});
router.delete('/saved-places/:id', validate({ params: idParam }), async (req, res) => {
  const r = await prisma.savedPlace.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!r.count) throw notFound('Place');
  res.json({ success: true, data: { deleted: true } });
});

// ---- Support tickets ----
router.get('/tickets', async (req, res) => {
  res.json({ success: true, data: await prisma.supportTicket.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 }) });
});
router.post(
  '/tickets',
  writeLimiter,
  validate({ body: z.object({ app: z.enum(['user', 'partner']).default('user'), category: z.enum(['account', 'booking', 'payment', 'vehicle', 'verification', 'app_issue', 'other']), subject: trimmed(150, 3), message: trimmed(2000, 10) }) }),
  async (req, res) => {
    const open = await prisma.supportTicket.count({ where: { userId: req.user.id, status: { in: ['open', 'in_progress'] } } });
    if (open >= 5) throw badRequest('You already have 5 open tickets. Please wait for a reply.');
    res.status(201).json({ success: true, data: await prisma.supportTicket.create({ data: { ...req.body, userId: req.user.id } }) });
  }
);

module.exports = { router, serializeUser };
