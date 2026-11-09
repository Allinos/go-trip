'use strict';
/**
 * Ratings & reviews.
 *  - Trips: a passenger rates a completed booking (one review per booking, editable).
 *  - Marketplace drivers: a user who contacted the driver through GoTrip (call / WhatsApp) can rate them
 *    (one review per user per driver, editable). Hiring happens offline, so the contact record is the proof.
 * Both kinds count towards the same partner rating.
 * Partner.ratingAvg / ratingCount are kept in sync so listings can show stars without extra queries.
 */
const express = require('express');
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { validate, z, idParam, optText, pageQuery } = require('../lib/validate');
const { authenticate, requireActivePartner } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { badRequest, notFound } = require('../lib/errors');
const { paginate, pageMeta } = require('../lib/util');
const notify = require('../services/notify');

const reviewBody = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: optText(500) });

const firstName = (n) => (n || '').trim().split(/\s+/)[0] || null;
const serialize = (r) => ({
  id: r.id,
  rating: r.rating,
  comment: r.comment,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  by: firstName(r.user?.fullName ?? r.booking?.passengerName),
  route: r.booking ? `${r.booking.pickupName} → ${r.booking.dropName}` : undefined,
  kind: r.bookingId ? 'trip' : 'driver',
});
const reviewInclude = { user: { select: { fullName: true } }, booking: { select: { pickupName: true, dropName: true } } };

/** Recompute a partner's average from visible reviews (cheap: indexed by partner). */
async function refreshRating(partnerId, db = prisma) {
  const [agg] = await db.$queryRaw`SELECT COALESCE(AVG(rating), 0)::float AS avg, COUNT(*)::int AS count FROM reviews WHERE partner_id = ${partnerId} AND is_hidden = false`;
  await db.partner.update({ where: { id: partnerId }, data: { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.count } });
  // Ratings appear on trip pages, search results and the driver marketplace.
  await Promise.all([cache.delPrefix('trips:search:'), cache.delPrefix('mkt:'), cache.invalidateDashboard(partnerId)]);
}

/** Latest visible reviews of a partner, for public pages. */
async function recentReviews(partnerId, take = 5) {
  const rows = await prisma.review.findMany({
    where: { partnerId, isHidden: false },
    orderBy: { createdAt: 'desc' },
    take,
    include: reviewInclude,
  });
  return rows.map(serialize);
}

/** Reviews of a partner, newest first (public). */
async function listReviews(partnerId, query) {
  const { page, limit, skip, take } = paginate(query);
  const where = { partnerId, isHidden: false };
  const [items, total] = await Promise.all([prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: reviewInclude }), prisma.review.count({ where })]);
  return { data: items.map(serialize), meta: pageMeta(page, limit, total) };
}

/** Can this user rate this driver, and what did they say before? */
async function driverReviewState(partnerId, userId) {
  const [mine, contacted] = await Promise.all([
    prisma.review.findFirst({ where: { partnerId, userId, bookingId: null } }),
    prisma.contactEvent.findFirst({ where: { partnerId, userId }, select: { id: true } }),
  ]);
  return { canReview: !!contacted, myReview: mine ? { rating: mine.rating, comment: mine.comment, updatedAt: mine.updatedAt } : null };
}

/** Create or update a user's review of a marketplace driver. */
async function saveDriverReview(partnerId, partnerUserId, userId, body) {
  if (partnerUserId === userId) throw badRequest('You cannot rate yourself');
  const { canReview } = await driverReviewState(partnerId, userId);
  if (!canReview) throw badRequest('You can rate a driver after you call or message them through GoTrip', undefined, 'CONTACT_FIRST');
  const data = { rating: body.rating, comment: body.comment || null };
  const existing = await prisma.review.findFirst({ where: { partnerId, userId, bookingId: null } });
  let review;
  if (existing) review = await prisma.review.update({ where: { id: existing.id }, data });
  else {
    try {
      review = await prisma.review.create({ data: { ...data, partnerId, userId } });
    } catch (e) {
      if (e.code !== 'P2002') throw e; // double tap: the other request created it
      review = await prisma.review.update({ where: { id: (await prisma.review.findFirst({ where: { partnerId, userId, bookingId: null } })).id }, data });
    }
    notify.newReview(partnerUserId, review.rating);
  }
  await refreshRating(partnerId);
  return serialize(review);
}

// ---------- Passenger: /bookings/:id/review ----------
const userRouter = express.Router();
userRouter.use(authenticate);

userRouter.put('/:id/review', writeLimiter, validate({ params: idParam, body: reviewBody }), async (req, res) => {
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true, status: true, partnerId: true } });
  if (!b) throw notFound('Booking');
  if (b.status !== 'completed') throw badRequest('You can rate a trip after it is completed', undefined, 'NOT_COMPLETED');
  const data = { rating: req.body.rating, comment: req.body.comment || null };
  const existed = await prisma.review.findUnique({ where: { bookingId: b.id }, select: { id: true } });
  const review = await prisma.review.upsert({ where: { bookingId: b.id }, create: { ...data, bookingId: b.id, partnerId: b.partnerId, userId: req.user.id }, update: data });
  await refreshRating(b.partnerId);
  if (!existed) {
    const p = await prisma.partner.findUnique({ where: { id: b.partnerId }, select: { userId: true } });
    notify.newReview(p.userId, review.rating);
  }
  res.json({ success: true, data: serialize(review) });
});

// ---------- Partner: /partner/reviews ----------
const partnerRouter = express.Router();
partnerRouter.use(authenticate, requireActivePartner);

partnerRouter.get('/', validate({ query: z.object(pageQuery) }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = { partnerId: req.partner.id, isHidden: false };
  const [items, total, dist] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { user: { select: { fullName: true } }, booking: { select: { pickupName: true, dropName: true } } },
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true } }),
  ]);
  const p = await prisma.partner.findUnique({ where: { id: req.partner.id }, select: { ratingAvg: true, ratingCount: true } });
  res.json({
    success: true,
    data: items.map(serialize),
    meta: {
      ...pageMeta(page, limit, total),
      average: p.ratingAvg,
      count: p.ratingCount,
      stars: Object.fromEntries([5, 4, 3, 2, 1].map((s) => [s, dist.find((d) => d.rating === s)?._count._all || 0])),
    },
  });
});

module.exports = { userRouter, partnerRouter, refreshRating, recentReviews, listReviews, driverReviewState, saveDriverReview, serialize, reviewBody };
