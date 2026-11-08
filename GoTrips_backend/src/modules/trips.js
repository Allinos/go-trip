'use strict';
const express = require('express');
const prisma = require('../lib/prisma');
const { Prisma } = require('@prisma/client');
const storage = require('../services/storage');
const notify = require('../services/notify');
const { validate, z, idParam, trimmed, optText, lat, lng, money, pageQuery } = require('../lib/validate');
const { authenticate, optionalAuth, requireActivePartner, requireCapability } = require('../middleware/auth');
const { badRequest, notFound, conflict } = require('../lib/errors');
const { placeKey, paginate, pageMeta, mapsUrl, mapsDirectionsUrl } = require('../lib/util');
const { partnerContact, contactSelect } = require('./vehicles');

const MAX_DAYS_AHEAD = 60;

const stopSchema = z.object({
  placeName: trimmed(120, 2),
  district: optText(80),
  lat: lat.optional().nullable(),
  lng: lng.optional().nullable(),
  fareFromStart: money.optional().nullable(),
  etaMinutes: z.coerce.number().int().min(0).max(48 * 60).optional().nullable(),
});

const tripBody = z.object({
  vehicleId: z.coerce.number().int().positive(),
  tripType: z.enum(['start', 'return']).default('start'),
  parentTripId: z.coerce.number().int().positive().optional().nullable(),
  departureAt: z.coerce.date(),
  arrivalAt: z.coerce.date().optional().nullable(),
  stops: z.array(stopSchema).min(2, 'Add a starting point and a destination').max(15, 'Up to 15 stops are allowed'),
  totalSeats: z.coerce.number().int().min(1).max(80),
  pricePerSeat: money,
  acceptsParcels: z.boolean().optional(),
  notes: optText(500),
});

/** Fare for `seats` between two stops. Uses per-stop fares when the partner set them, else the full-route price. */
function estimateFare(trip, stops, pickupSeq, dropSeq, seats) {
  const last = stops.length - 1;
  const fareAt = (seq) => (seq === 0 ? 0 : seq === last ? (stops[seq].fareFromStart ?? trip.pricePerSeat) : stops[seq].fareFromStart);
  const a = fareAt(pickupSeq);
  const b = fareAt(dropSeq);
  const perSeat = a != null && b != null && b > a ? b - a : trip.pricePerSeat;
  return perSeat * seats;
}

function validateTiming(departureAt, arrivalAt) {
  const now = Date.now();
  if (departureAt.getTime() < now - 10 * 60_000) throw badRequest('Departure time must be in the future');
  if (departureAt.getTime() > now + MAX_DAYS_AHEAD * 86400_000) throw badRequest(`Trips can be created up to ${MAX_DAYS_AHEAD} days ahead`);
  if (arrivalAt && arrivalAt <= departureAt) throw badRequest('Arrival time must be after departure time');
}

function validateStops(stops) {
  const keys = stops.map((s) => placeKey(s.placeName));
  if (keys[0] === keys[keys.length - 1]) throw badRequest('Start and destination cannot be the same place');
  if (new Set(keys).size !== keys.length) throw badRequest('Each stop should appear only once');
  let prev = 0;
  stops.forEach((s, i) => {
    if (i > 0 && s.fareFromStart != null) {
      if (s.fareFromStart < prev) throw badRequest('Stop fares must increase along the route');
      prev = s.fareFromStart;
    }
  });
}

const stopRows = (stops) => stops.map((s, i) => ({ seq: i, placeName: s.placeName, placeKey: placeKey(s.placeName), district: s.district || null, lat: s.lat ?? null, lng: s.lng ?? null, fareFromStart: i === 0 ? 0 : (s.fareFromStart ?? null), etaMinutes: i === 0 ? 0 : (s.etaMinutes ?? null) }));

async function serializeTrip(t, { loggedIn = false, owner = false } = {}) {
  const stops = (t.stops || []).sort((a, b) => a.seq - b.seq);
  return {
    id: t.id,
    tripType: t.tripType,
    parentTripId: t.parentTripId,
    originName: t.originName,
    destinationName: t.destinationName,
    departureAt: t.departureAt,
    arrivalAt: t.arrivalAt,
    totalSeats: t.totalSeats,
    availableSeats: t.availableSeats,
    bookedSeats: t.totalSeats - t.availableSeats,
    pricePerSeat: t.pricePerSeat,
    acceptsParcels: t.acceptsParcels,
    bookingOpen: t.bookingOpen,
    notes: t.notes,
    status: t.status,
    cancelReason: t.cancelReason,
    stops: stops.map((s) => ({ seq: s.seq, placeName: s.placeName, district: s.district, lat: s.lat, lng: s.lng, fareFromStart: s.fareFromStart, etaMinutes: s.etaMinutes, mapsUrl: mapsUrl(s.lat, s.lng) })),
    routeMapsUrl: mapsDirectionsUrl(t.originName, t.destinationName),
    vehicle: t.vehicle
      ? { id: t.vehicle.id, vehicleClass: t.vehicle.vehicleClass, make: t.vehicle.make, model: t.vehicle.model, color: t.vehicle.color, hasAc: t.vehicle.hasAc, seats: t.vehicle.seats, photo: await storage.url(t.vehicle.photoKeys?.[0]), registrationNumber: owner ? t.vehicle.registrationNumber : t.vehicle.registrationNumber.replace(/^(.{4}).*(.{4})$/, '$1••$2') }
      : undefined,
    driver: t.partner && !owner ? await partnerContact(t.partner, loggedIn) : undefined,
    createdAt: t.createdAt,
  };
}

const tripInclude = { stops: true, vehicle: true };

// ======================= Partner: /partner/trips =======================
const partnerRouter = express.Router();
partnerRouter.use(authenticate, requireActivePartner, requireCapability('canCreateTrips'));

async function ownTrip(req, include = tripInclude) {
  const t = await prisma.trip.findFirst({ where: { id: req.params.id, partnerId: req.partner.id }, include });
  if (!t) throw notFound('Trip');
  return t;
}

async function usableVehicle(partnerId, vehicleId, seats) {
  const v = await prisma.vehicle.findFirst({ where: { id: vehicleId, partnerId } });
  if (!v) throw notFound('Vehicle');
  if (v.verificationStatus !== 'approved') throw badRequest('This vehicle is not verified yet. You can create trips after admin approval.', undefined, 'VEHICLE_NOT_VERIFIED');
  if (!v.forTrips) throw badRequest('Turn on "Use for trips" for this vehicle first');
  if (!v.isAvailable) throw badRequest('This vehicle is switched OFF. Turn it ON to create trips.');
  if (v.seats && seats > v.seats) throw badRequest(`This vehicle has only ${v.seats} seats`);
  return v;
}

async function ensureNoClash(vehicleId, departureAt, excludeId) {
  const window = 60 * 60_000;
  const clash = await prisma.trip.findFirst({
    where: { vehicleId, status: { in: ['scheduled', 'ongoing'] }, departureAt: { gte: new Date(departureAt.getTime() - window), lte: new Date(departureAt.getTime() + window) }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, departureAt: true },
  });
  if (clash) throw conflict('This vehicle already has a trip within 1 hour of that time', 'TRIP_CLASH');
}

partnerRouter.get(
  '/',
  validate({ query: z.object({ when: z.enum(['upcoming', 'past', 'all']).default('upcoming'), type: z.enum(['start', 'return']).optional(), status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(), ...pageQuery }) }),
  async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query);
    const q = req.query;
    const where = {
      partnerId: req.partner.id,
      ...(q.type ? { tripType: q.type } : {}),
      ...(q.status ? { status: q.status } : q.when === 'upcoming' ? { status: { in: ['scheduled', 'ongoing'] } } : q.when === 'past' ? { status: { in: ['completed', 'cancelled'] } } : {}),
    };
    const [items, total, pendingCounts] = await Promise.all([
      prisma.trip.findMany({ where, include: tripInclude, orderBy: { departureAt: q.when === 'past' ? 'desc' : 'asc' }, skip, take }),
      prisma.trip.count({ where }),
      prisma.booking.groupBy({ by: ['tripId'], where: { partnerId: req.partner.id, status: 'pending' }, _count: { _all: true } }),
    ]);
    const pending = Object.fromEntries(pendingCounts.map((p) => [p.tripId, p._count._all]));
    res.json({ success: true, data: await Promise.all(items.map(async (t) => ({ ...(await serializeTrip(t, { owner: true })), pendingRequests: pending[t.id] || 0 }))), meta: pageMeta(page, limit, total) });
  }
);

partnerRouter.post('/', validate({ body: tripBody }), async (req, res) => {
  const b = req.body;
  validateTiming(b.departureAt, b.arrivalAt);
  validateStops(b.stops);
  await usableVehicle(req.partner.id, b.vehicleId, b.totalSeats);
  if (b.parentTripId) {
    const parent = await prisma.trip.findFirst({ where: { id: b.parentTripId, partnerId: req.partner.id } });
    if (!parent) throw notFound('Outbound trip');
    if (b.departureAt <= parent.departureAt) throw badRequest('The return trip must depart after the outbound trip');
    b.tripType = 'return';
  }
  await ensureNoClash(b.vehicleId, b.departureAt);
  const trip = await prisma.trip.create({
    data: {
      partnerId: req.partner.id,
      vehicleId: b.vehicleId,
      tripType: b.tripType,
      parentTripId: b.parentTripId || null,
      originName: b.stops[0].placeName,
      destinationName: b.stops[b.stops.length - 1].placeName,
      departureAt: b.departureAt,
      arrivalAt: b.arrivalAt || null,
      totalSeats: b.totalSeats,
      availableSeats: b.totalSeats,
      pricePerSeat: b.pricePerSeat,
      acceptsParcels: !!b.acceptsParcels,
      notes: b.notes,
      stops: { create: stopRows(b.stops) },
    },
    include: tripInclude,
  });
  res.status(201).json({ success: true, data: await serializeTrip(trip, { owner: true }) });
});

/** One-tap return trip: same vehicle, reversed route, new time. */
partnerRouter.post(
  '/:id/return-trip',
  validate({ params: idParam, body: z.object({ departureAt: z.coerce.date(), arrivalAt: z.coerce.date().optional().nullable(), totalSeats: z.coerce.number().int().min(1).max(80).optional(), pricePerSeat: money.optional(), notes: optText(500) }) }),
  async (req, res) => {
    const parent = await ownTrip(req);
    const b = req.body;
    validateTiming(b.departureAt, b.arrivalAt);
    if (b.departureAt <= parent.departureAt) throw badRequest('The return trip must depart after the outbound trip');
    const seats = b.totalSeats || parent.totalSeats;
    await usableVehicle(req.partner.id, parent.vehicleId, seats);
    await ensureNoClash(parent.vehicleId, b.departureAt);
    const stops = [...parent.stops].sort((a, c) => c.seq - a.seq);
    const total = parent.pricePerSeat;
    const reversed = stops.map((s, i) => ({ placeName: s.placeName, district: s.district, lat: s.lat, lng: s.lng, fareFromStart: i === 0 ? 0 : s.fareFromStart != null ? total - s.fareFromStart : null, etaMinutes: null }));
    const trip = await prisma.trip.create({
      data: {
        partnerId: req.partner.id,
        vehicleId: parent.vehicleId,
        tripType: 'return',
        parentTripId: parent.id,
        originName: parent.destinationName,
        destinationName: parent.originName,
        departureAt: b.departureAt,
        arrivalAt: b.arrivalAt || null,
        totalSeats: seats,
        availableSeats: seats,
        pricePerSeat: b.pricePerSeat ?? parent.pricePerSeat,
        acceptsParcels: parent.acceptsParcels,
        notes: b.notes ?? parent.notes,
        stops: { create: stopRows(reversed) },
      },
      include: tripInclude,
    });
    res.status(201).json({ success: true, data: await serializeTrip(trip, { owner: true }) });
  }
);

partnerRouter.get('/:id', validate({ params: idParam }), async (req, res) => {
  const t = await ownTrip(req, { ...tripInclude, bookings: { orderBy: { createdAt: 'desc' } }, returnTrips: { select: { id: true, departureAt: true, status: true } } });
  res.json({
    success: true,
    data: {
      ...(await serializeTrip(t, { owner: true })),
      returnTrips: t.returnTrips,
      bookings: t.bookings.map((b) => ({ id: b.id, code: b.code, status: b.status, seats: b.seats, pickupName: b.pickupName, dropName: b.dropName, fareEstimate: b.fareEstimate, passengerName: b.passengerName, passengerPhone: b.passengerPhone, note: b.note, createdAt: b.createdAt })),
    },
  });
});

partnerRouter.patch(
  '/:id',
  validate({ params: idParam, body: tripBody.omit({ vehicleId: true, tripType: true, parentTripId: true }).partial() }),
  async (req, res) => {
    const t = await ownTrip(req, { ...tripInclude, bookings: { where: { status: { in: ['pending', 'accepted'] } }, select: { id: true } } });
    if (t.status !== 'scheduled') throw badRequest('Only scheduled trips can be edited');
    const b = req.body;
    const data = {};
    if (b.departureAt || b.arrivalAt !== undefined) {
      const dep = b.departureAt || t.departureAt;
      validateTiming(dep, b.arrivalAt === undefined ? t.arrivalAt : b.arrivalAt);
      if (b.departureAt) await ensureNoClash(t.vehicleId, dep, t.id);
      Object.assign(data, { departureAt: dep, ...(b.arrivalAt !== undefined ? { arrivalAt: b.arrivalAt } : {}) });
    }
    if (b.totalSeats != null) {
      const booked = t.totalSeats - t.availableSeats;
      if (b.totalSeats < booked) throw badRequest(`${booked} seat(s) are already booked. Total seats cannot be less than that.`);
      if (t.vehicle.seats && b.totalSeats > t.vehicle.seats) throw badRequest(`This vehicle has only ${t.vehicle.seats} seats`);
      Object.assign(data, { totalSeats: b.totalSeats, availableSeats: b.totalSeats - booked });
    }
    if (b.pricePerSeat != null) data.pricePerSeat = b.pricePerSeat;
    if (b.acceptsParcels !== undefined) data.acceptsParcels = b.acceptsParcels;
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.stops) {
      if (t.bookings.length) throw badRequest('The route cannot be changed after booking requests arrive. Cancel and create a new trip instead.');
      validateStops(b.stops);
      Object.assign(data, { originName: b.stops[0].placeName, destinationName: b.stops[b.stops.length - 1].placeName, stops: { deleteMany: {}, create: stopRows(b.stops) } });
    }
    // Seat counts are re-checked in the UPDATE itself so a concurrent accept can't break them.
    const updated = await prisma.trip.update({ where: { id: t.id, availableSeats: t.availableSeats }, data, include: tripInclude }).catch((e) => {
      if (e.code === 'P2025') throw conflict('Seats changed while you were editing. Please refresh and try again.');
      throw e;
    });
    res.json({ success: true, data: await serializeTrip(updated, { owner: true }) });
  }
);

partnerRouter.patch('/:id/booking-open', validate({ params: idParam, body: z.object({ bookingOpen: z.boolean() }) }), async (req, res) => {
  const t = await ownTrip(req);
  if (t.status !== 'scheduled') throw badRequest('Only scheduled trips accept bookings');
  const updated = await prisma.trip.update({ where: { id: t.id }, data: { bookingOpen: req.body.bookingOpen }, include: tripInclude });
  res.json({ success: true, data: await serializeTrip(updated, { owner: true }) });
});

partnerRouter.post('/:id/start', validate({ params: idParam }), async (req, res) => {
  const t = await ownTrip(req);
  if (t.status !== 'scheduled') throw badRequest('Trip is not scheduled');
  if (t.departureAt.getTime() - Date.now() > 3 * 3600_000) throw badRequest('You can start the trip up to 3 hours before departure');
  const updated = await prisma.trip.update({ where: { id: t.id }, data: { status: 'ongoing', startedAt: new Date(), bookingOpen: false }, include: tripInclude });
  const accepted = await prisma.booking.findMany({ where: { tripId: t.id, status: 'accepted' } });
  accepted.forEach((b) => notify.tripStarted(b));
  // Expire requests the partner never answered.
  await prisma.booking.updateMany({ where: { tripId: t.id, status: 'pending' }, data: { status: 'expired', statusReason: 'Trip started', cancelledBy: 'system' } });
  res.json({ success: true, data: await serializeTrip(updated, { owner: true }) });
});

partnerRouter.post('/:id/complete', validate({ params: idParam }), async (req, res) => {
  const t = await ownTrip(req);
  if (!['scheduled', 'ongoing'].includes(t.status)) throw badRequest('Trip is already closed');
  if (t.status === 'scheduled' && t.departureAt > new Date()) throw badRequest('A trip can be completed only after its departure time');
  await prisma.$transaction([
    prisma.booking.updateMany({ where: { tripId: t.id, status: 'accepted' }, data: { status: 'completed', completedAt: new Date() } }),
    prisma.booking.updateMany({ where: { tripId: t.id, status: 'pending' }, data: { status: 'expired', statusReason: 'Trip completed', cancelledBy: 'system' } }),
    prisma.trip.update({ where: { id: t.id }, data: { status: 'completed', completedAt: new Date(), bookingOpen: false } }),
    prisma.locationShare.updateMany({ where: { partnerId: req.partner.id, tripId: t.id }, data: { isSharing: false } }),
  ]);
  const updated = await prisma.trip.findUnique({ where: { id: t.id }, include: tripInclude });
  res.json({ success: true, data: await serializeTrip(updated, { owner: true }) });
});

partnerRouter.post('/:id/cancel', validate({ params: idParam, body: z.object({ reason: trimmed(255, 3) }) }), async (req, res) => {
  const t = await ownTrip(req);
  if (!['scheduled', 'ongoing'].includes(t.status)) throw badRequest('Trip is already closed');
  const affected = await prisma.booking.findMany({ where: { tripId: t.id, status: { in: ['pending', 'accepted'] } } });
  await prisma.$transaction([
    prisma.booking.updateMany({ where: { tripId: t.id, status: { in: ['pending', 'accepted'] } }, data: { status: 'cancelled', cancelledBy: 'partner', statusReason: req.body.reason } }),
    prisma.trip.update({ where: { id: t.id }, data: { status: 'cancelled', cancelReason: req.body.reason, bookingOpen: false } }),
    prisma.locationShare.updateMany({ where: { partnerId: req.partner.id, tripId: t.id }, data: { isSharing: false } }),
  ]);
  affected.forEach((b) => notify.bookingCancelledByPartner(b, req.body.reason));
  const updated = await prisma.trip.findUnique({ where: { id: t.id }, include: tripInclude });
  res.json({ success: true, data: await serializeTrip(updated, { owner: true }), meta: { bookingsCancelled: affected.length } });
});

// ======================= Public: /trips =======================
const publicRouter = express.Router();

/** IST day window for a YYYY-MM-DD date. */
function dayWindow(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  return [start, new Date(start.getTime() + 86400_000)];
}

publicRouter.get(
  '/search',
  optionalAuth,
  validate({
    query: z.object({
      from: z.string().trim().max(120).optional(),
      to: z.string().trim().max(120).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
      seats: z.coerce.number().int().min(1).max(20).default(1),
      type: z.enum(['start', 'return']).optional(),
      ...pageQuery,
    }),
  }),
  async (req, res) => {
    const q = req.query;
    const { page, limit, skip, take } = paginate(q, { defaultLimit: 20, maxLimit: 50 });
    const fromKey = q.from ? placeKey(q.from) : null;
    const toKey = q.to ? placeKey(q.to) : null;
    const now = new Date();
    let [winStart, winEnd] = q.date ? dayWindow(q.date) : [now, new Date(now.getTime() + MAX_DAYS_AHEAD * 86400_000)];
    if (winStart < now) winStart = now;

    const like = (k) => `%${k}%`;
    const fromCond = fromKey ? Prisma.sql`AND (a.place_key LIKE ${like(fromKey)} OR lower(a.district) = ${fromKey})` : Prisma.empty;
    const toCond = toKey ? Prisma.sql`AND (b.place_key LIKE ${like(toKey)} OR lower(b.district) = ${toKey})` : Prisma.empty;
    const typeCond = q.type ? Prisma.sql`AND t.trip_type = ${q.type}::"TripType"` : Prisma.empty;

    // For each trip pick the earliest matching pickup stop and the first matching drop stop after it.
    const base = Prisma.sql`
      FROM trips t
      JOIN trip_stops a ON a.trip_id = t.id
      JOIN trip_stops b ON b.trip_id = t.id AND b.seq > a.seq
      JOIN partners p ON p.id = t.partner_id
      JOIN users u ON u.id = p.user_id
      WHERE t.status = 'scheduled' AND t.booking_open = true AND t.available_seats >= ${q.seats}
        AND t.departure_at >= ${winStart} AND t.departure_at < ${winEnd}
        AND p.account_status = 'active' AND u.status = 'active'
        ${typeCond}
        ${fromKey ? fromCond : Prisma.sql`AND a.seq = 0`}
        ${toKey ? toCond : Prisma.sql`AND b.seq = (SELECT max(seq) FROM trip_stops s WHERE s.trip_id = t.id)`}`;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT * FROM (
          SELECT DISTINCT ON (t.id) t.id, t.departure_at, a.seq AS pickup_seq, b.seq AS drop_seq
          ${base}
          ORDER BY t.id, a.seq, b.seq
        ) m ORDER BY m.departure_at ASC LIMIT ${take} OFFSET ${skip}`,
      prisma.$queryRaw`SELECT COUNT(DISTINCT t.id)::int AS total ${base}`,
    ]);

    const trips = rows.length ? await prisma.trip.findMany({ where: { id: { in: rows.map((r) => r.id) } }, include: { ...tripInclude, partner: { select: contactSelect } } }) : [];
    const byId = Object.fromEntries(trips.map((t) => [t.id, t]));
    const loggedIn = !!req.user;
    const data = await Promise.all(
      rows.map(async (r) => {
        const t = byId[r.id];
        const stops = [...t.stops].sort((x, y) => x.seq - y.seq);
        return {
          ...(await serializeTrip(t, { loggedIn })),
          match: { pickupSeq: r.pickup_seq, dropSeq: r.drop_seq, pickupName: stops[r.pickup_seq].placeName, dropName: stops[r.drop_seq].placeName, farePerSeat: estimateFare(t, stops, r.pickup_seq, r.drop_seq, 1) },
        };
      })
    );
    res.json({ success: true, data, meta: pageMeta(page, limit, countRows[0]?.total || 0) });
  }
);

publicRouter.get('/:id', optionalAuth, validate({ params: idParam }), async (req, res) => {
  const t = await prisma.trip.findFirst({ where: { id: req.params.id, partner: { accountStatus: 'active' } }, include: { ...tripInclude, partner: { select: contactSelect } } });
  if (!t) throw notFound('Trip');
  const myBooking = req.user ? await prisma.booking.findFirst({ where: { tripId: t.id, userId: req.user.id }, orderBy: { createdAt: 'desc' }, select: { id: true, code: true, status: true, seats: true } }) : null;
  res.json({ success: true, data: { ...(await serializeTrip(t, { loggedIn: !!req.user })), myBooking } });
});

module.exports = { partnerRouter, publicRouter, serializeTrip, estimateFare, tripInclude };
