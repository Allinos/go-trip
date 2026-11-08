'use strict';
/** Public, cacheable reference data: app config, partner categories, districts/places, FAQs. */
const express = require('express');
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const settings = require('../services/settings');
const partnerService = require('./partners/service');
const { validate, z } = require('../lib/validate');
const { placeKey } = require('../lib/util');
const { VEHICLE_CLASSES } = require('./vehicles');

const router = express.Router();
const publicCache = (sec) => (_req, res, next) => {
  res.setHeader('Cache-Control', `public, max-age=${sec}`);
  next();
};

const serializeCategory = (c) => ({
  code: c.code,
  name: c.name,
  description: c.description,
  icon: c.icon,
  registrationFee: c.registrationFee,
  feeValidityDays: c.feeValidityDays,
  capabilities: { driverProfile: c.hasDriverProfile, vehicles: c.canListVehicles, trips: c.canCreateTrips, rentals: c.canListRentals, goodsOrders: c.canViewGoodsOrders },
  documents: c.requirements.map((r) => ({ scope: r.scope, docType: r.docType, label: r.label, hint: r.hint, isRequired: r.isRequired, requiresNumber: r.requiresNumber, requiresExpiry: r.requiresExpiry, requiresBack: r.requiresBack })),
});

router.get('/config', publicCache(60), async (_req, res) => {
  const [s, cats] = await Promise.all([settings.publicSettings(), partnerService.categories()]);
  res.json({ success: true, data: { ...s, vehicleClasses: VEHICLE_CLASSES, categories: cats.map(serializeCategory) } });
});

router.get('/categories', publicCache(300), async (_req, res) => {
  res.json({ success: true, data: (await partnerService.categories()).map(serializeCategory) });
});

router.get('/locations/districts', publicCache(3600), async (_req, res) => {
  const data = await cache.wrap('catalog:districts', 3600, () =>
    prisma.district.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, places: { where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, lat: true, lng: true } } } })
  );
  res.json({ success: true, data });
});

router.get('/locations/search', publicCache(300), validate({ query: z.object({ q: z.string().trim().min(2).max(60) }) }), async (req, res) => {
  const key = placeKey(req.query.q);
  const data = await cache.wrap(`catalog:locsearch:${key}`, 600, async () => {
    const [places, districts] = await Promise.all([
      prisma.place.findMany({ where: { isActive: true, nameKey: { contains: key } }, take: 15, orderBy: { name: 'asc' }, select: { id: true, name: true, lat: true, lng: true, district: { select: { name: true } } } }),
      prisma.district.findMany({ where: { isActive: true, name: { contains: req.query.q, mode: 'insensitive' } }, take: 5, select: { id: true, name: true } }),
    ]);
    return [...districts.map((d) => ({ type: 'district', name: d.name, district: d.name })), ...places.map((p) => ({ type: 'place', id: p.id, name: p.name, district: p.district.name, lat: p.lat, lng: p.lng }))];
  });
  res.json({ success: true, data });
});

router.get('/faqs', publicCache(600), validate({ query: z.object({ audience: z.enum(['user', 'partner']).default('user') }) }), async (req, res) => {
  const data = await cache.wrap(`catalog:faqs:${req.query.audience}`, 600, () =>
    prisma.faq.findMany({ where: { isActive: true, audience: { in: ['all', req.query.audience] } }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { id: true, question: true, answer: true } })
  );
  res.json({ success: true, data });
});

module.exports = router;
