'use strict';
const express = require('express');
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const storage = require('../services/storage');
const partnerService = require('./partners/service');
const { validate, z, idParam, trimmed, optText, strList, lat, lng, money, boolish, pageQuery } = require('../lib/validate');
const { authenticate, optionalAuth, requireActivePartner, requireCapability } = require('../middleware/auth');
const { imageUpload, documentUpload } = require('../middleware/upload');
const { writeLimiter } = require('../middleware/rateLimit');
const { badRequest, notFound, forbidden } = require('../lib/errors');
const { paginate, pageMeta, haversineKm, mapsUrl, startOfDay } = require('../lib/util');
const { langOf, tr } = require('../lib/i18n');
const localReq = (r, lang) => ({ ...r, label: tr(r, lang, 'label'), hint: tr(r, lang, 'hint'), translations: undefined });

const VEHICLE_CLASSES = ['hatchback', 'sedan', 'suv', 'muv', 'van', 'mini_bus', 'bus', 'auto', 'bike', 'pickup', 'tempo', 'mini_truck', 'truck', 'trailer', 'other'];
const MAX_PHOTOS = 8;
// Changing these on an approved vehicle sends it back for admin verification.
const KEY_FIELDS = ['registrationNumber', 'vehicleClass', 'make', 'model', 'year'];

const regNo = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(v) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(v), 'Enter a valid registration number, e.g. AS01AB1234');

const baseVehicle = {
  vehicleClass: z.enum(VEHICLE_CLASSES),
  make: trimmed(50),
  model: trimmed(50),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1).optional().nullable(),
  color: optText(30),
  registrationNumber: regNo,
  seats: z.coerce.number().int().min(1).max(80).optional().nullable(),
  loadCapacityKg: z.coerce.number().int().min(0).max(60000).optional().nullable(),
  fuelType: z.enum(['petrol', 'diesel', 'cng', 'electric', 'hybrid']).optional().nullable(),
  hasAc: z.boolean().optional(),
  features: strList(20, 40).optional(),
  description: optText(1000),
  forTrips: z.boolean().optional(),
  forRental: z.boolean().optional(),
  forGoods: z.boolean().optional(),
};
const rentalFields = {
  rentalPricePerDay: money.optional().nullable(),
  rentalPricePerHour: money.optional().nullable(),
  rentalDriverOption: z.enum(['self_drive', 'with_driver', 'both']).optional().nullable(),
  securityDeposit: money.optional().nullable(),
  rentalMinHours: z.coerce.number().int().min(1).max(720).optional().nullable(),
  rentalDistrict: optText(80),
  rentalCity: optText(80),
  rentalAddress: optText(255),
  rentalLat: lat.optional().nullable(),
  rentalLng: lng.optional().nullable(),
  rentalTerms: optText(1000),
};
const createSchema = z.object({ ...baseVehicle, ...rentalFields });
const updateSchema = z.object({ ...baseVehicle, ...rentalFields }).partial();

function checkUsage(category, v) {
  if (v.forTrips && !category.canCreateTrips) throw forbidden('Your partner type cannot create trips');
  if (v.forRental && !category.canListRentals) throw forbidden('Your partner type cannot list rentals');
  if (v.forGoods && !category.canViewGoodsOrders) throw forbidden('Your partner type cannot carry goods');
}

function checkRental(v) {
  if (!v.forRental) return;
  if (!v.rentalPricePerDay && !v.rentalPricePerHour) throw badRequest('Set a rental price per day or per hour');
  if (!v.rentalDistrict) throw badRequest('Choose the district where the vehicle is available for rent');
  if (!v.rentalDriverOption) throw badRequest('Choose if the rental is self-drive or with driver');
}

async function serialize(v, { owner = false } = {}) {
  const out = {
    id: v.id,
    vehicleClass: v.vehicleClass,
    make: v.make,
    model: v.model,
    year: v.year,
    color: v.color,
    registrationNumber: owner ? v.registrationNumber : v.registrationNumber?.replace(/^(.{4}).*(.{4})$/, '$1••$2'),
    seats: v.seats,
    loadCapacityKg: v.loadCapacityKg,
    fuelType: v.fuelType,
    hasAc: v.hasAc,
    features: v.features,
    description: v.description,
    photos: await storage.urls(v.photoKeys),
    forTrips: v.forTrips,
    forRental: v.forRental,
    forGoods: v.forGoods,
    isAvailable: v.isAvailable,
    verificationStatus: v.verificationStatus,
    isVerified: v.verificationStatus === 'approved',
    rental: v.forRental
      ? {
          available: v.rentalAvailable && v.isAvailable,
          pricePerDay: v.rentalPricePerDay,
          pricePerHour: v.rentalPricePerHour,
          driverOption: v.rentalDriverOption,
          securityDeposit: v.securityDeposit,
          minHours: v.rentalMinHours,
          district: v.rentalDistrict,
          city: v.rentalCity,
          address: v.rentalAddress,
          lat: v.rentalLat,
          lng: v.rentalLng,
          mapsUrl: mapsUrl(v.rentalLat, v.rentalLng),
          terms: v.rentalTerms,
        }
      : null,
    updatedAt: v.updatedAt,
  };
  if (owner) Object.assign(out, { rejectionReason: v.rejectionReason, submittedAt: v.submittedAt, verifiedAt: v.verifiedAt, rentalAvailable: v.rentalAvailable });
  return out;
}

const clearPublicCache = () => cache.delPrefix('rent:');

// =============== Partner: /partner/vehicles ===============
const partnerRouter = express.Router();
partnerRouter.use(authenticate, requireActivePartner, requireCapability('canListVehicles'));
partnerRouter.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => res.statusCode < 400 && cache.invalidateDashboard(req.partner?.id));
  next();
});

const ownVehicle = async (req) => {
  const v = await prisma.vehicle.findFirst({ where: { id: req.params.id, partnerId: req.partner.id } });
  if (!v) throw notFound('Vehicle');
  return v;
};

partnerRouter.get('/', validate({ query: z.object({ status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(), usage: z.enum(['trips', 'rental', 'goods']).optional() }) }), async (req, res) => {
  const where = { partnerId: req.partner.id, ...(req.query.status ? { verificationStatus: req.query.status } : {}), ...(req.query.usage === 'trips' ? { forTrips: true } : req.query.usage === 'rental' ? { forRental: true } : req.query.usage === 'goods' ? { forGoods: true } : {}) };
  const items = await prisma.vehicle.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data: await Promise.all(items.map((v) => serialize(v, { owner: true }))) });
});

partnerRouter.get('/requirements', async (req, res) => {
  const category = await partnerService.categoryById(req.partner.category.id);
  res.json({ success: true, data: { vehicleClasses: VEHICLE_CLASSES, documents: category.requirements.filter((r) => r.scope === 'vehicle').map((r) => localReq(r, langOf(req))) } });
});

partnerRouter.post('/', writeLimiter, validate({ body: createSchema }), async (req, res) => {
  const b = req.body;
  if (!b.forTrips && !b.forRental && !b.forGoods) {
    // Sensible default from category so simple partners don't have to understand the flags.
    const c = req.partner.category;
    b.forTrips = c.canCreateTrips;
    b.forRental = !c.canCreateTrips && c.canListRentals;
    b.forGoods = !c.canCreateTrips && !c.canListRentals && c.canViewGoodsOrders;
  }
  checkUsage(req.partner.category, b);
  checkRental(b);
  if (b.forTrips && !b.seats) throw badRequest('Enter the number of passenger seats');
  const count = await prisma.vehicle.count({ where: { partnerId: req.partner.id } });
  if (count >= 50) throw badRequest('You can list up to 50 vehicles. Contact support for more.');
  const v = await prisma.vehicle.create({ data: { ...b, partnerId: req.partner.id, verificationStatus: 'pending', rentalAvailable: !!b.forRental } });
  res.status(201).json({ success: true, data: await serialize(v, { owner: true }) });
});

partnerRouter.get('/:id', validate({ params: idParam }), async (req, res) => {
  const v = await ownVehicle(req);
  const [docs, category, tripCount] = await Promise.all([
    prisma.vehicleDocument.findMany({ where: { vehicleId: v.id } }),
    partnerService.categoryById(req.partner.category.id),
    prisma.trip.count({ where: { vehicleId: v.id } }),
  ]);
  const byType = Object.fromEntries(docs.map((d) => [d.docType, d]));
  const documents = await Promise.all(
    category.requirements
      .filter((r) => r.scope === 'vehicle')
      .map(async (r) => {
        const d = byType[r.docType];
        return { requirement: localReq(r, langOf(req)), document: d ? { id: d.id, docNumber: d.docNumber, expiryDate: d.expiryDate, status: d.status, rejectionReason: d.rejectionReason, frontUrl: await storage.url(d.frontKey, 900), backUrl: await storage.url(d.backKey, 900) } : null };
      })
  );
  res.json({ success: true, data: { ...(await serialize(v, { owner: true })), documents, tripCount } });
});

partnerRouter.patch('/:id', validate({ params: idParam, body: updateSchema }), async (req, res) => {
  const v = await ownVehicle(req);
  const merged = { ...v, ...req.body };
  checkUsage(req.partner.category, merged);
  checkRental(merged);
  const data = { ...req.body };
  const keyChanged = KEY_FIELDS.some((k) => k in req.body && req.body[k] !== v[k]);
  if (keyChanged && v.verificationStatus !== 'pending') Object.assign(data, { verificationStatus: 'pending', submittedAt: new Date(), rejectionReason: null, verifiedAt: null });
  if (v.verificationStatus === 'rejected') Object.assign(data, { verificationStatus: 'pending', submittedAt: new Date(), rejectionReason: null });
  if (req.body.forRental === false) data.rentalAvailable = false;
  const updated = await prisma.vehicle.update({ where: { id: v.id }, data });
  await clearPublicCache();
  res.json({ success: true, data: await serialize(updated, { owner: true }), meta: { resubmitted: data.verificationStatus === 'pending' && v.verificationStatus !== 'pending' } });
});

/** Quick ON/OFF switches used from the vehicle list. */
partnerRouter.patch('/:id/availability', validate({ params: idParam, body: z.object({ isAvailable: z.boolean().optional(), rentalAvailable: z.boolean().optional() }) }), async (req, res) => {
  const v = await ownVehicle(req);
  if (req.body.rentalAvailable && !v.forRental) throw badRequest('Enable rental for this vehicle first');
  const updated = await prisma.vehicle.update({ where: { id: v.id }, data: req.body });
  await clearPublicCache();
  res.json({ success: true, data: await serialize(updated, { owner: true }) });
});

partnerRouter.delete('/:id', validate({ params: idParam }), async (req, res) => {
  const v = await ownVehicle(req);
  const active = await prisma.trip.count({ where: { vehicleId: v.id, status: { in: ['scheduled', 'ongoing'] } } });
  if (active) throw badRequest('This vehicle has upcoming trips. Cancel or complete them first.');
  const used = await prisma.trip.count({ where: { vehicleId: v.id } });
  if (used) {
    // Keep history intact: hide instead of deleting.
    await prisma.vehicle.update({ where: { id: v.id }, data: { isAvailable: false, rentalAvailable: false, forRental: false, verificationStatus: 'suspended', rejectionReason: 'Removed by partner' } });
  } else {
    const docs = await prisma.vehicleDocument.findMany({ where: { vehicleId: v.id } });
    await prisma.vehicle.delete({ where: { id: v.id } });
    [...v.photoKeys, ...docs.flatMap((d) => [d.frontKey, d.backKey])].forEach((k) => storage.remove(k));
  }
  await clearPublicCache();
  res.json({ success: true, data: { deleted: true } });
});

partnerRouter.post('/:id/photos', writeLimiter, imageUpload.array('photos', MAX_PHOTOS), validate({ params: idParam }), async (req, res) => {
  const v = await ownVehicle(req);
  if (!req.files?.length) throw badRequest('Choose at least one photo');
  if (v.photoKeys.length + req.files.length > MAX_PHOTOS) throw badRequest(`You can add up to ${MAX_PHOTOS} photos`);
  const keys = [];
  for (const f of req.files) keys.push(await storage.save(f, `vehicles/${v.id}`));
  const updated = await prisma.vehicle.update({ where: { id: v.id }, data: { photoKeys: [...v.photoKeys, ...keys] } });
  await clearPublicCache();
  res.json({ success: true, data: await serialize(updated, { owner: true }) });
});

partnerRouter.delete('/:id/photos/:index', validate({ params: z.object({ id: z.coerce.number().int().positive(), index: z.coerce.number().int().min(0) }) }), async (req, res) => {
  const v = await ownVehicle(req);
  const key = v.photoKeys[req.params.index];
  if (!key) throw notFound('Photo');
  const updated = await prisma.vehicle.update({ where: { id: v.id }, data: { photoKeys: v.photoKeys.filter((_, i) => i !== req.params.index) } });
  storage.remove(key);
  await clearPublicCache();
  res.json({ success: true, data: await serialize(updated, { owner: true }) });
});

partnerRouter.post(
  '/:id/documents/:docType',
  writeLimiter,
  documentUpload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  validate({ params: z.object({ id: z.coerce.number().int().positive(), docType: z.string().max(40) }), body: z.object({ docNumber: optText(60), expiryDate: z.coerce.date().optional().nullable() }) }),
  async (req, res) => {
    const v = await ownVehicle(req);
    const category = await partnerService.categoryById(req.partner.category.id);
    const reqm = category.requirements.find((r) => r.scope === 'vehicle' && r.docType === req.params.docType);
    if (!reqm) throw badRequest('This document is not needed for vehicles');
    const existing = await prisma.vehicleDocument.findUnique({ where: { vehicleId_docType: { vehicleId: v.id, docType: reqm.docType } } });
    const front = req.files?.front?.[0];
    const back = req.files?.back?.[0];
    if (!front && !existing) throw badRequest('Please upload a photo of the document');
    if (reqm.requiresExpiry) {
      const exp = req.body.expiryDate || existing?.expiryDate;
      if (!exp) throw badRequest(`Enter the ${reqm.label} expiry date`);
      if (new Date(exp) < startOfDay()) throw badRequest(`${reqm.label} has expired`);
    }
    const data = {
      frontKey: front ? await storage.save(front, `docs/vehicle/${v.id}`, { allowPdf: true }) : existing.frontKey,
      backKey: back ? await storage.save(back, `docs/vehicle/${v.id}`, { allowPdf: true }) : existing?.backKey || null,
      docNumber: req.body.docNumber ?? existing?.docNumber ?? null,
      expiryDate: req.body.expiryDate ?? existing?.expiryDate ?? null,
      status: 'pending',
      rejectionReason: null,
      reviewedAt: null,
    };
    const doc = await prisma.vehicleDocument.upsert({ where: { vehicleId_docType: { vehicleId: v.id, docType: reqm.docType } }, create: { ...data, vehicleId: v.id, docType: reqm.docType }, update: data });
    if (existing && front) storage.remove(existing.frontKey);
    if (existing?.backKey && back) storage.remove(existing.backKey);
    if (v.verificationStatus === 'rejected') await prisma.vehicle.update({ where: { id: v.id }, data: { verificationStatus: 'pending', submittedAt: new Date(), rejectionReason: null } });
    res.json({ success: true, data: { id: doc.id, docType: doc.docType, status: doc.status } });
  }
);

// =============== Public rental marketplace: /rentals ===============
const publicRouter = express.Router();

const publicWhere = {
  forRental: true,
  verificationStatus: 'approved',
  partner: { accountStatus: 'active', user: { status: 'active' } },
};

const contactSelect = { id: true, ratingAvg: true, ratingCount: true, businessName: true, whatsappPhone: true, alternatePhone: true, verificationStatus: true, district: true, city: true, user: { select: { fullName: true, phone: true, photoKey: true } } };

async function partnerContact(p, loggedIn) {
  return {
    partnerId: p.id,
    name: p.businessName || p.user.fullName,
    photoUrl: await storage.url(p.user.photoKey),
    isVerified: p.verificationStatus === 'approved',
    district: p.district,
    city: p.city,
    // Phone numbers are shown to logged-in users only (protects partners from scraping).
    phone: loggedIn ? p.user.phone : null,
    whatsappPhone: loggedIn ? p.whatsappPhone || p.user.phone : null,
    loginRequired: !loggedIn,
    rating: p.ratingCount ? { average: p.ratingAvg, count: p.ratingCount } : null,
  };
}

publicRouter.get(
  '/',
  optionalAuth,
  validate({
    query: z.object({
      district: z.string().trim().max(80).optional(),
      city: z.string().trim().max(80).optional(),
      q: z.string().trim().max(80).optional(),
      vehicleClass: z.enum(VEHICLE_CLASSES).optional(),
      driverOption: z.enum(['self_drive', 'with_driver']).optional(),
      availableOnly: boolish.optional(),
      lat: lat.optional(),
      lng: lng.optional(),
      radiusKm: z.coerce.number().min(1).max(300).default(50),
      maxPricePerDay: money.optional(),
      ...pageQuery,
    }),
  }),
  async (req, res) => {
    const qy = req.query;
    const { page, limit, skip, take } = paginate(qy, { defaultLimit: 20, maxLimit: 50 });
    const where = {
      ...publicWhere,
      ...(qy.district ? { rentalDistrict: { equals: qy.district, mode: 'insensitive' } } : {}),
      ...(qy.city ? { rentalCity: { contains: qy.city, mode: 'insensitive' } } : {}),
      ...(qy.vehicleClass ? { vehicleClass: qy.vehicleClass } : {}),
      ...(qy.driverOption ? { rentalDriverOption: { in: [qy.driverOption, 'both'] } } : {}),
      ...(qy.availableOnly ? { rentalAvailable: true, isAvailable: true } : {}),
      ...(qy.maxPricePerDay ? { rentalPricePerDay: { lte: qy.maxPricePerDay } } : {}),
      ...(qy.q
        ? { OR: [{ make: { contains: qy.q, mode: 'insensitive' } }, { model: { contains: qy.q, mode: 'insensitive' } }, { rentalCity: { contains: qy.q, mode: 'insensitive' } }, { rentalAddress: { contains: qy.q, mode: 'insensitive' } }] }
        : {}),
    };
    const loggedIn = !!req.user;
    const cacheKey = `rent:${loggedIn ? 1 : 0}:${JSON.stringify(qy)}`;
    await cache.sendCached(req, res, cacheKey, 30, async () => {
      let rows;
      let total;
      if (qy.lat != null && qy.lng != null) {
        // Bounding box pre-filter on the (rental_lat, rental_lng) index, then exact distance sort.
        const dLat = qy.radiusKm / 111;
        const dLng = qy.radiusKm / (111 * Math.cos((qy.lat * Math.PI) / 180));
        const candidates = await prisma.vehicle.findMany({
          where: { ...where, rentalLat: { gte: qy.lat - dLat, lte: qy.lat + dLat }, rentalLng: { gte: qy.lng - dLng, lte: qy.lng + dLng } },
          include: { partner: { select: contactSelect } },
          take: 500,
        });
        const withDist = candidates
          .map((v) => ({ v, d: haversineKm(qy.lat, qy.lng, v.rentalLat, v.rentalLng) }))
          .filter((x) => x.d <= qy.radiusKm)
          .sort((a, b) => Number(b.v.rentalAvailable) - Number(a.v.rentalAvailable) || a.d - b.d);
        total = withDist.length;
        rows = withDist.slice(skip, skip + take).map((x) => ({ ...x.v, distanceKm: Math.round(x.d * 10) / 10 }));
      } else {
        [rows, total] = await Promise.all([
          prisma.vehicle.findMany({ where, include: { partner: { select: contactSelect } }, orderBy: [{ rentalAvailable: 'desc' }, { updatedAt: 'desc' }], skip, take }),
          prisma.vehicle.count({ where }),
        ]);
      }
      const items = await Promise.all(rows.map(async (v) => ({ ...(await serialize(v)), distanceKm: v.distanceKm ?? null, owner: await partnerContact(v.partner, loggedIn) })));
      return { success: true, data: items, meta: pageMeta(page, limit, total) };
    });
  }
);

publicRouter.get('/:id', optionalAuth, validate({ params: idParam }), async (req, res) => {
  const loggedIn = !!req.user;
  const data = await cache.wrap(`rent:detail:${req.params.id}:${loggedIn ? 1 : 0}`, 30, async () => {
    const v = await prisma.vehicle.findFirst({ where: { id: req.params.id, ...publicWhere }, include: { partner: { select: contactSelect } } });
    return v ? { ...(await serialize(v)), owner: await partnerContact(v.partner, loggedIn) } : null;
  });
  if (!data) throw notFound('Vehicle');
  res.json({ success: true, data });
});

module.exports = { partnerRouter, publicRouter, serialize, partnerContact, contactSelect, VEHICLE_CLASSES, clearPublicCache };
