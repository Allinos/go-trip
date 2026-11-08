'use strict';
/**
 * Ratings & reviews. A passenger can rate a trip once it is completed (one review per booking, editable).
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
});

/** Recompute a partner's average from visible reviews (cheap: indexed by partner). */
async function refreshRating(partnerId, db = prisma) {
  const [agg] = await db.$queryRaw`SELECT COALESCE(AVG(rating), 0)::float AS avg, COUNT(*)::int AS count FROM reviews WHERE partner_id = ${partnerId} AND is_hidden = false`;
  await db.partner.update({ where: { id: partnerId }, data: { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.count } });
  // Ratings appear on trip pages and search results.
  await Promise.all([cache.delPrefix('trips:search:'), cache.invalidateDashboard(partnerId)]);
}

/** Latest visible reviews of a partner, for public pages. */
async function recentReviews(partnerId, take = 5) {
  const rows = await prisma.review.findMany({
    where: { partnerId, isHidden: false },
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { fullName: true } }, booking: { select: { pickupName: true, dropName: true } } },
  });
  return rows.map(serialize);
}

// ---------- Passenger: /bookings/:id/review ----------
const userRouter = express.Router();
userRouter.use(authenticate);

userRouter.put('/:id/review', writeLimiter, validate({ params: idParam, body: reviewBody }), async (req, res) => {
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true, status: true, partnerId: true } });
  if (!b) throw notFound('Booking');
  if (b.status !== 'completed') throw badRequest('You can rate a trip after it is completed', undefined, 'NOT_COMPLETED');
  const data = { rating: req.body.rating, comment: req.body.comment || null };
  const review = await prisma.review.upsert({ where: { bookingId: b.id }, create: { ...data, bookingId: b.id, partnerId: b.partnerId, userId: req.user.id }, update: data });
  await refreshRating(b.partnerId);
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

module.exports = { userRouter, partnerRouter, refreshRating, recentReviews, serialize };
