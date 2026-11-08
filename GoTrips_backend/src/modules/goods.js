'use strict';
/**
 * Goods transport orders.
 * BUILT BUT DISABLED: every route checks the `goods_orders_enabled` setting (default false) and returns
 * 403 FEATURE_DISABLED until an admin turns it on in Admin → Settings. The apps hide the entry points
 * using GET /config → features.goodsOrders.
 */
const express = require('express');
const prisma = require('../lib/prisma');
const settings = require('../services/settings');
const { validate, z, idParam, trimmed, optText, lat, lng, money, pageQuery } = require('../lib/validate');
const { authenticate, requireActivePartner, requireCapability } = require('../middleware/auth');
const { featureDisabled, notFound, badRequest } = require('../lib/errors');
const { paginate, pageMeta } = require('../lib/util');
const { VEHICLE_CLASSES } = require('./vehicles');

const requireEnabled = async (_req, _res, next) => {
  if (!(await settings.get('goods_orders_enabled'))) throw featureDisabled('Goods transport is coming soon');
  next();
};

// ---- Customers: /goods-orders ----
const userRouter = express.Router();
userRouter.use(requireEnabled, authenticate);

userRouter.post(
  '/',
  validate({
    body: z.object({
      pickupName: trimmed(160),
      pickupDistrict: optText(80),
      pickupLat: lat.optional().nullable(),
      pickupLng: lng.optional().nullable(),
      dropName: trimmed(160),
      dropDistrict: optText(80),
      dropLat: lat.optional().nullable(),
      dropLng: lng.optional().nullable(),
      goodsType: trimmed(80),
      weightKg: z.coerce.number().int().min(1).max(60000).optional().nullable(),
      vehicleClass: z.enum(VEHICLE_CLASSES).optional().nullable(),
      pickupDate: z.coerce.date(),
      description: optText(1000),
      budget: money.optional().nullable(),
    }),
  }),
  async (req, res) => {
    if (req.body.pickupDate < new Date(Date.now() - 86400_000)) throw badRequest('Pickup date must be today or later');
    const open = await prisma.goodsOrder.count({ where: { userId: req.user.id, status: 'open' } });
    if (open >= 5) throw badRequest('You can have up to 5 open orders');
    const order = await prisma.goodsOrder.create({ data: { ...req.body, userId: req.user.id, contactPhone: req.user.phone } });
    res.status(201).json({ success: true, data: order });
  }
);

userRouter.get('/', async (req, res) => {
  res.json({ success: true, data: await prisma.goodsOrder.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 }) });
});

userRouter.post('/:id/close', validate({ params: idParam, body: z.object({ status: z.enum(['assigned', 'closed', 'cancelled']) }) }), async (req, res) => {
  const r = await prisma.goodsOrder.updateMany({ where: { id: req.params.id, userId: req.user.id, status: 'open' }, data: { status: req.body.status } });
  if (!r.count) throw notFound('Order');
  res.json({ success: true, data: { updated: true } });
});

// ---- Partners: /partner/goods-orders ----
const partnerRouter = express.Router();
partnerRouter.use(requireEnabled, authenticate, requireActivePartner, requireCapability('canViewGoodsOrders'));

partnerRouter.get('/', validate({ query: z.object({ district: z.string().trim().max(80).optional(), ...pageQuery }) }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = { status: 'open', pickupDate: { gte: new Date(Date.now() - 86400_000) }, ...(req.query.district ? { OR: [{ pickupDistrict: req.query.district }, { dropDistrict: req.query.district }] } : {}) };
  const [items, total] = await Promise.all([prisma.goodsOrder.findMany({ where, orderBy: { pickupDate: 'asc' }, skip, take, include: { user: { select: { fullName: true } } } }), prisma.goodsOrder.count({ where })]);
  res.json({ success: true, data: items, meta: pageMeta(page, limit, total) });
});

partnerRouter.get('/:id', validate({ params: idParam }), async (req, res) => {
  const o = await prisma.goodsOrder.findFirst({ where: { id: req.params.id, status: 'open' }, include: { user: { select: { fullName: true } } } });
  if (!o) throw notFound('Order');
  await prisma.contactEvent.create({ data: { partnerId: req.partner.id, userId: o.userId, targetType: 'goods_order', targetId: o.id, channel: 'view' } });
  res.json({ success: true, data: { ...o, telUrl: `tel:${o.contactPhone}` } });
});

module.exports = { userRouter, partnerRouter };
