'use strict';
const express = require('express');
const prisma = require('../lib/prisma');
const notify = require('../services/notify');
const cache = require('../lib/cache');
const { validate, z, idParam, trimmed, optText, pageQuery } = require('../lib/validate');
const { authenticate, requireActivePartner } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { badRequest, notFound, conflict } = require('../lib/errors');
const { shortCode, paginate, pageMeta, mapsUrl } = require('../lib/util');
const { serializeTrip, estimateFare, tripInclude, clearTripCache } = require('./trips');
const { contactSelect } = require('./vehicles');

const STATUSES = ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired'];

const serializeBooking = (b) => ({
  id: b.id,
  code: b.code,
  status: b.status,
  statusReason: b.statusReason,
  cancelledBy: b.cancelledBy,
  seats: b.seats,
  pickupSeq: b.pickupSeq,
  dropSeq: b.dropSeq,
  pickupName: b.pickupName,
  dropName: b.dropName,
  fareEstimate: b.fareEstimate,
  passengerName: b.passengerName,
  passengerPhone: b.passengerPhone,
  note: b.note,
  goodsType: b.goodsType,
  loadKg: b.loadKg,
  respondedAt: b.respondedAt,
  createdAt: b.createdAt,
});

/** Atomically take seats. Returns false if not enough seats left (no race conditions). Records whether the trip became full. */
async function reserveSeats(tx, tripId, seats, locals) {
  const rows = await tx.$queryRaw`UPDATE trips SET available_seats = available_seats - ${seats}, updated_at = now() WHERE id = ${tripId} AND status = 'scheduled' AND available_seats >= ${seats} RETURNING available_seats`;
  if (!rows.length) return false;
  if (locals) Object.assign(locals, { tripId, searchAll: rows[0].available_seats === 0 });
  return true;
}
async function releaseSeats(tx, tripId, seats, locals) {
  const rows = await tx.$queryRaw`UPDATE trips SET available_seats = LEAST(total_seats, available_seats + ${seats}), updated_at = now() WHERE id = ${tripId} RETURNING available_seats`;
  // A full trip that has seats again must reappear in search results.
  if (locals) Object.assign(locals, { tripId, searchAll: rows[0]?.available_seats === seats });
}

/** Location the partner is sharing, visible only to passengers with an accepted booking. */
async function sharedLocation(partnerId, tripId) {
  const s = await prisma.locationShare.findUnique({ where: { partnerId } });
  if (!s || !s.isSharing || (s.expiresAt && s.expiresAt < new Date()) || s.lat == null) return null;
  if (s.tripId && s.tripId !== tripId) return null;
  return { lat: s.lat, lng: s.lng, accuracyM: s.accuracyM, updatedAt: s.updatedAt, mapsUrl: mapsUrl(s.lat, s.lng), stale: Date.now() - s.updatedAt.getTime() > 10 * 60_000 };
}

/** Seat counts change on accept/cancel: drop cached search pages once the change is committed. */
const clearAfterWrite = (req, res, next) => {
  if (req.method !== 'GET')
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      if (res.locals.tripId) clearTripCache(res.locals.tripId, { all: res.locals.searchAll });
      cache.invalidateDashboard(req.partner?.id || res.locals.partnerId);
    });
  next();
};

// ======================= User: /bookings =======================
const userRouter = express.Router();
userRouter.use(authenticate, clearAfterWrite);

userRouter.post(
  '/',
  writeLimiter,
  validate({ body: z.object({ tripId: z.coerce.number().int().positive(), seats: z.coerce.number().int().min(1).max(20), pickupSeq: z.coerce.number().int().min(0), dropSeq: z.coerce.number().int().min(1), passengerName: optText(100), note: optText(300), goodsType: optText(80), loadKg: z.coerce.number().int().min(1).max(60000).optional().nullable() }) }),
  async (req, res) => {
    const b = req.body;
    const trip = await prisma.trip.findFirst({ where: { id: b.tripId }, include: { stops: true, vehicle: { select: { verificationStatus: true } }, partner: { select: { id: true, userId: true, accountStatus: true } } } });
    if (!trip || trip.partner.accountStatus !== 'active') throw notFound('Trip');
    if (trip.vehicle.verificationStatus !== 'approved') throw badRequest('This trip is no longer accepting bookings', undefined, 'TRIP_CLOSED');
    if (trip.partner.userId === req.user.id) throw badRequest('You cannot book your own trip');
    if (trip.status !== 'scheduled' || !trip.bookingOpen || trip.departureAt < new Date()) throw badRequest('This trip is no longer accepting bookings', undefined, 'TRIP_CLOSED');
    if (trip.kind === 'goods') {
      // The whole vehicle is hired: one request = the vehicle, described by what is carried.
      b.seats = 1;
      if (!b.goodsType) throw badRequest('Say what goods you want to send', undefined, 'GOODS_REQUIRED');
      if (b.loadKg && trip.capacityKg && b.loadKg > trip.capacityKg) throw badRequest(`This vehicle can carry up to ${trip.capacityKg} kg`, undefined, 'OVER_CAPACITY');
    } else {
      b.goodsType = null;
      b.loadKg = null;
    }
    if (b.seats > trip.availableSeats) throw badRequest(trip.availableSeats ? `Only ${trip.availableSeats} seat(s) left` : 'This trip is full', undefined, 'NOT_ENOUGH_SEATS');
    const stops = [...trip.stops].sort((x, y) => x.seq - y.seq);
    if (b.dropSeq <= b.pickupSeq || b.dropSeq >= stops.length) throw badRequest('Choose a drop point after your pickup point');

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fullName: true, phone: true } });
    try {
      const booking = await prisma.booking.create({
        data: {
          code: shortCode('GT', 6),
          tripId: trip.id,
          userId: req.user.id,
          partnerId: trip.partnerId,
          seats: b.seats,
          pickupSeq: b.pickupSeq,
          dropSeq: b.dropSeq,
          pickupName: stops[b.pickupSeq].placeName,
          dropName: stops[b.dropSeq].placeName,
          fareEstimate: estimateFare(trip, stops, b.pickupSeq, b.dropSeq, b.seats),
          passengerName: b.passengerName || user.fullName,
          passengerPhone: user.phone,
          note: b.note,
          goodsType: b.goodsType,
          loadKg: b.loadKg,
        },
      });
      res.locals.partnerId = trip.partnerId;
      notify.bookingRequested(booking, trip, trip.partner.userId);
      res.status(201).json({ success: true, data: serializeBooking(booking) });
    } catch (e) {
      if (e.code === 'P2002') throw conflict('You already have a booking request for this trip', 'DUPLICATE_BOOKING');
      throw e;
    }
  }
);

userRouter.get('/', validate({ query: z.object({ status: z.enum(STATUSES).optional(), when: z.enum(['upcoming', 'past', 'all']).default('all'), ...pageQuery }) }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const q = req.query;
  const where = {
    userId: req.user.id,
    ...(q.status ? { status: q.status } : q.when === 'upcoming' ? { status: { in: ['pending', 'accepted'] } } : q.when === 'past' ? { status: { in: ['rejected', 'cancelled', 'completed', 'expired'] } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { trip: { include: { ...tripInclude, partner: { select: contactSelect } } } } }),
    prisma.booking.count({ where }),
  ]);
  const data = await Promise.all(items.map(async (b) => ({ ...serializeBooking(b), trip: await serializeTrip(b.trip, { loggedIn: true }) })));
  res.json({ success: true, data, meta: pageMeta(page, limit, total) });
});

userRouter.get('/:id', validate({ params: idParam }), async (req, res) => {
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { review: true, trip: { include: { ...tripInclude, partner: { select: contactSelect } } } } });
  if (!b) throw notFound('Booking');
  const live = ['accepted'].includes(b.status) && ['scheduled', 'ongoing'].includes(b.trip.status) ? await sharedLocation(b.partnerId, b.tripId) : null;
  const trip = await serializeTrip(b.trip, { loggedIn: true });
  // Confirmed passengers see the full number plate so they can check the vehicle before boarding.
  if (['accepted', 'completed'].includes(b.status)) trip.vehicle.registrationNumber = b.trip.vehicle.registrationNumber;
  const review = b.review ? { rating: b.review.rating, comment: b.review.comment, updatedAt: b.review.updatedAt } : null;
  res.json({ success: true, data: { ...serializeBooking(b), trip, liveLocation: live, review, canReview: b.status === 'completed' } });
});

userRouter.get('/:id/location', validate({ params: idParam }), async (req, res) => {
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.user.id, status: 'accepted' }, select: { partnerId: true, tripId: true } });
  if (!b) throw notFound('Booking');
  res.json({ success: true, data: await sharedLocation(b.partnerId, b.tripId) });
});

userRouter.post('/:id/cancel', validate({ params: idParam, body: z.object({ reason: optText(255) }) }), async (req, res) => {
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { partner: { select: { userId: true } }, trip: { select: { status: true } } } });
  if (!b) throw notFound('Booking');
  if (!['pending', 'accepted'].includes(b.status)) throw badRequest('This booking cannot be cancelled');
  if (b.trip.status !== 'scheduled') throw badRequest('The trip has already started. Please call the driver.', undefined, 'TRIP_STARTED');
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.booking.updateMany({ where: { id: b.id, status: b.status }, data: { status: 'cancelled', cancelledBy: 'user', statusReason: req.body.reason || 'Cancelled by passenger' } });
    if (r.count !== 1) throw conflict('Booking status changed. Please refresh.');
    if (b.status === 'accepted') await releaseSeats(tx, b.tripId, b.seats, res.locals);
    return tx.booking.findUnique({ where: { id: b.id } });
  });
  res.locals.partnerId = b.partnerId;
  notify.bookingCancelledByUser(updated, b.partner.userId);
  res.json({ success: true, data: serializeBooking(updated) });
});

// ======================= Partner: /partner/bookings =======================
const partnerRouter = express.Router();
partnerRouter.use(authenticate, requireActivePartner, clearAfterWrite);

partnerRouter.get('/', validate({ query: z.object({ status: z.enum(STATUSES).optional(), tripId: z.coerce.number().int().positive().optional(), ...pageQuery }) }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = { partnerId: req.partner.id, ...(req.query.status ? { status: req.query.status } : {}), ...(req.query.tripId ? { tripId: req.query.tripId } : {}) };
  const [items, total, counts] = await Promise.all([
    prisma.booking.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip, take, include: { trip: { select: { id: true, originName: true, destinationName: true, departureAt: true, status: true, tripType: true, kind: true, availableSeats: true } } } }),
    prisma.booking.count({ where }),
    prisma.booking.groupBy({ by: ['status'], where: { partnerId: req.partner.id }, _count: { _all: true } }),
  ]);
  res.json({ success: true, data: items.map((b) => ({ ...serializeBooking(b), trip: b.trip })), meta: { ...pageMeta(page, limit, total), counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) } });
});

async function ownBooking(req) {
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, partnerId: req.partner.id }, include: { review: true, trip: { include: tripInclude } } });
  if (!b) throw notFound('Booking');
  return b;
}

partnerRouter.get('/:id', validate({ params: idParam }), async (req, res) => {
  const b = await ownBooking(req);
  const review = b.review && !b.review.isHidden ? { rating: b.review.rating, comment: b.review.comment } : null;
  res.json({ success: true, data: { ...serializeBooking(b), trip: await serializeTrip(b.trip, { owner: true }), review } });
});

partnerRouter.post('/:id/accept', validate({ params: idParam }), async (req, res) => {
  const b = await ownBooking(req);
  if (b.status !== 'pending') throw badRequest(`This request is already ${b.status}`);
  if (b.trip.status !== 'scheduled') throw badRequest('This trip is not open anymore');
  const updated = await prisma.$transaction(async (tx) => {
    if (!(await reserveSeats(tx, b.tripId, b.seats, res.locals))) throw conflict('Not enough seats left on this trip to accept this request', 'NOT_ENOUGH_SEATS');
    const r = await tx.booking.updateMany({ where: { id: b.id, status: 'pending' }, data: { status: 'accepted', respondedAt: new Date() } });
    if (r.count !== 1) throw conflict('This request was changed. Please refresh.');
    return tx.booking.findUnique({ where: { id: b.id } });
  });
  notify.bookingResponded(updated, b.trip, true);
  res.json({ success: true, data: serializeBooking(updated) });
});

partnerRouter.post('/:id/reject', validate({ params: idParam, body: z.object({ reason: optText(255) }) }), async (req, res) => {
  const b = await ownBooking(req);
  if (b.status !== 'pending') throw badRequest(`This request is already ${b.status}`);
  const r = await prisma.booking.updateMany({ where: { id: b.id, status: 'pending' }, data: { status: 'rejected', respondedAt: new Date(), statusReason: req.body.reason || null } });
  if (r.count !== 1) throw conflict('This request was changed. Please refresh.');
  const updated = await prisma.booking.findUnique({ where: { id: b.id } });
  notify.bookingResponded(updated, b.trip, false);
  res.json({ success: true, data: serializeBooking(updated) });
});

partnerRouter.post('/:id/cancel', validate({ params: idParam, body: z.object({ reason: trimmed(255, 3) }) }), async (req, res) => {
  const b = await ownBooking(req);
  if (b.status !== 'accepted') throw badRequest('Only confirmed bookings can be cancelled');
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.booking.updateMany({ where: { id: b.id, status: 'accepted' }, data: { status: 'cancelled', cancelledBy: 'partner', statusReason: req.body.reason } });
    if (r.count !== 1) throw conflict('This booking was changed. Please refresh.');
    await releaseSeats(tx, b.tripId, b.seats, res.locals);
    return tx.booking.findUnique({ where: { id: b.id } });
  });
  notify.bookingCancelledByPartner(updated, req.body.reason);
  res.json({ success: true, data: serializeBooking(updated) });
});

module.exports = { userRouter, partnerRouter, serializeBooking, sharedLocation };
