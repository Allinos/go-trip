'use strict';
/**
 * Public driver marketplace. No request/lead system: users browse, open a profile and call directly.
 * Listing visibility is the denormalised DriverProfile.isListed flag (indexed), kept in sync by partners/service.
 */
const express = require('express');
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const storage = require('../services/storage');
const { validate, z, idParam, boolish, pageQuery } = require('../lib/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { notFound, badRequest } = require('../lib/errors');
const { paginate, pageMeta } = require('../lib/util');

const router = express.Router();

const driverSelect = {
  id: true,
  partnerId: true,
  headline: true,
  bio: true,
  hasPriorExperience: true,
  experienceYears: true,
  experienceDetails: true,
  licenseTypes: true,
  licenseExpiry: true,
  vehicleTypes: true,
  canDriveAutomatic: true,
  languages: true,
  serviceAreas: true,
  workTypes: true,
  availability: true,
  expectedPayMin: true,
  expectedPayMax: true,
  payUnit: true,
  education: true,
  hasOwnVehicle: true,
  district: true,
  city: true,
  isAvailable: true,
  completeness: true,
  viewCount: true,
  listedAt: true,
  updatedAt: true,
  partner: { select: { id: true, verificationStatus: true, whatsappPhone: true, createdAt: true, documents: { select: { docType: true, status: true } }, user: { select: { fullName: true, phone: true, photoKey: true, gender: true, dateOfBirth: true } } } },
};

const age = (dob) => (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000)) : null);

async function serializeDriver(d, { loggedIn, full = false }) {
  const u = d.partner.user;
  const out = {
    id: d.id,
    name: u.fullName,
    photoUrl: await storage.url(u.photoKey),
    age: age(u.dateOfBirth),
    gender: u.gender,
    headline: d.headline,
    experienceYears: d.experienceYears,
    hasPriorExperience: d.hasPriorExperience,
    vehicleTypes: d.vehicleTypes,
    licenseTypes: d.licenseTypes,
    languages: d.languages,
    workTypes: d.workTypes,
    availability: d.availability,
    expectedPay: d.expectedPayMin != null ? { min: d.expectedPayMin, max: d.expectedPayMax, unit: d.payUnit } : null,
    district: d.district,
    city: d.city,
    isAvailable: d.isAvailable,
    isVerified: d.partner.verificationStatus === 'approved',
    memberSince: d.partner.createdAt,
  };
  if (full) {
    Object.assign(out, {
      bio: d.bio,
      experienceDetails: d.experienceDetails,
      canDriveAutomatic: d.canDriveAutomatic,
      serviceAreas: d.serviceAreas,
      education: d.education,
      hasOwnVehicle: d.hasOwnVehicle,
      licenseValid: d.licenseExpiry ? new Date(d.licenseExpiry) > new Date() : null,
      // Only *which* documents are verified is public, never the documents themselves.
      verifiedDocuments: d.partner.documents.filter((x) => x.status === 'approved').map((x) => x.docType),
      profileViews: d.viewCount,
      phone: loggedIn ? u.phone : null,
      whatsappPhone: loggedIn ? d.partner.whatsappPhone || u.phone : null,
      loginRequired: !loggedIn,
    });
  }
  return out;
}

router.get(
  '/drivers',
  optionalAuth,
  validate({
    query: z.object({
      district: z.string().trim().max(80).optional(),
      q: z.string().trim().max(80).optional(),
      vehicleType: z.string().trim().max(30).optional(),
      workType: z.string().trim().max(30).optional(),
      language: z.string().trim().max(30).optional(),
      availability: z.enum(['full_time', 'part_time', 'on_call']).optional(),
      minExperience: z.coerce.number().int().min(0).max(60).optional(),
      verifiedOnly: boolish.optional(),
      sort: z.enum(['recent', 'experience', 'verified']).default('verified'),
      ...pageQuery,
    }),
  }),
  async (req, res) => {
    const q = req.query;
    const { page, limit, skip, take } = paginate(q, { defaultLimit: 20, maxLimit: 50 });
    const where = {
      isListed: true,
      ...(q.district ? { OR: [{ district: { equals: q.district, mode: 'insensitive' } }, { serviceAreas: { has: q.district } }] } : {}),
      ...(q.vehicleType ? { vehicleTypes: { has: q.vehicleType } } : {}),
      ...(q.workType ? { workTypes: { has: q.workType } } : {}),
      ...(q.language ? { languages: { has: q.language } } : {}),
      ...(q.availability ? { availability: q.availability } : {}),
      ...(q.minExperience ? { experienceYears: { gte: q.minExperience } } : {}),
      ...(q.verifiedOnly ? { partner: { verificationStatus: 'approved' } } : {}),
      ...(q.q ? { AND: [{ OR: [{ headline: { contains: q.q, mode: 'insensitive' } }, { city: { contains: q.q, mode: 'insensitive' } }, { partner: { user: { fullName: { contains: q.q, mode: 'insensitive' } } } }] }] } : {}),
    };
    const orderBy = q.sort === 'experience' ? [{ experienceYears: 'desc' }, { listedAt: 'desc' }] : q.sort === 'recent' ? [{ listedAt: 'desc' }] : [{ partner: { verificationStatus: 'asc' } }, { completeness: 'desc' }, { listedAt: 'desc' }];
    const loggedIn = !!req.user;
    await cache.sendCached(req, res, `mkt:${loggedIn ? 1 : 0}:${JSON.stringify(q)}`, 30, async () => {
      const [rows, total] = await Promise.all([prisma.driverProfile.findMany({ where, select: driverSelect, orderBy, skip, take }), prisma.driverProfile.count({ where })]);
      return { success: true, data: await Promise.all(rows.map((d) => serializeDriver(d, { loggedIn }))), meta: pageMeta(page, limit, total) };
    });
  }
);

router.get('/drivers/:id', optionalAuth, validate({ params: idParam }), async (req, res) => {
  const loggedIn = !!req.user;
  const data = await cache.wrap(`mkt:detail:${req.params.id}:${loggedIn ? 1 : 0}`, 30, async () => {
    const d = await prisma.driverProfile.findFirst({ where: { id: req.params.id, isListed: true }, select: driverSelect });
    return d ? serializeDriver(d, { loggedIn, full: true }) : null;
  });
  if (!data) throw notFound('Driver');
  cache.bump('driverViews', data.id); // flushed to the DB in batches by the scheduler
  res.json({ success: true, data });
});

/**
 * POST /contact — called when a user taps Call / WhatsApp. Returns the number and records the event
 * (partner insights: "calls received"). Requires login so numbers can't be scraped anonymously.
 */
router.post(
  '/contact',
  authenticate,
  validate({ body: z.object({ targetType: z.enum(['driver_profile', 'vehicle', 'trip', 'goods_order']), targetId: z.coerce.number().int().positive(), channel: z.enum(['call', 'whatsapp']).default('call') }) }),
  async (req, res) => {
    const { targetType, targetId, channel } = req.body;
    let partner = null;
    if (targetType === 'driver_profile') {
      const d = await prisma.driverProfile.findFirst({ where: { id: targetId, isListed: true }, select: { partner: { select: { id: true, whatsappPhone: true, user: { select: { phone: true } } } } } });
      partner = d?.partner;
      if (partner) cache.bump('driverCalls', targetId);
    } else if (targetType === 'vehicle') {
      const v = await prisma.vehicle.findFirst({ where: { id: targetId, verificationStatus: 'approved' }, select: { partner: { select: { id: true, whatsappPhone: true, user: { select: { phone: true } } } } } });
      partner = v?.partner;
    } else if (targetType === 'trip') {
      const t = await prisma.trip.findFirst({ where: { id: targetId }, select: { partner: { select: { id: true, whatsappPhone: true, user: { select: { phone: true } } } } } });
      partner = t?.partner;
    } else {
      throw badRequest('Use the goods order contact endpoint');
    }
    if (!partner) throw notFound('Listing');
    await prisma.contactEvent.create({ data: { partnerId: partner.id, userId: req.user.id, targetType, targetId, channel } });
    const phone = channel === 'whatsapp' ? partner.whatsappPhone || partner.user.phone : partner.user.phone;
    res.json({ success: true, data: { phone, telUrl: `tel:${phone}`, whatsappUrl: `https://wa.me/${phone.replace(/\D/g, '')}` } });
  }
);

module.exports = router;
