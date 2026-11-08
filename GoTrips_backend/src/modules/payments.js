'use strict';
const express = require('express');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const logger = require('../lib/logger');
const notify = require('../services/notify');
const razorpay = require('../services/razorpay');
const partnerService = require('./partners/service');
const { validate, z, pageQuery } = require('../lib/validate');
const { authenticate, requirePartner, invalidateAuthCache } = require('../middleware/auth');
const { badRequest, notFound, conflict, AppError } = require('../lib/errors');
const { shortCode, hmac, safeEqual, paginate, pageMeta } = require('../lib/util');

const RENEW_WINDOW_DAYS = 15;

const serialize = (p) => ({
  id: p.id,
  purpose: p.purpose,
  amount: p.amount,
  currency: p.currency,
  status: p.status,
  receipt: p.receipt,
  razorpayOrderId: p.razorpayOrderId,
  razorpayPaymentId: p.razorpayPaymentId,
  method: p.method,
  failureReason: p.failureReason,
  paidAt: p.paidAt,
  validUntil: p.validUntil,
  categoryCode: p.categoryCode,
  createdAt: p.createdAt,
});

const checkoutToken = (orderId) => hmac(env.FILE_URL_SECRET, `checkout:${orderId}`).slice(0, 24);

/**
 * Mark a payment as paid and extend the partner's listing. Safe to call many times
 * (client verify + webhook + reconciliation can all race): only the first call changes state.
 */
async function markPaid(paymentId, rzp) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === 'paid') return null;
    if (rzp.amount !== payment.amount || rzp.order_id !== payment.razorpayOrderId || rzp.currency !== payment.currency) {
      logger.error({ paymentId, rzp: { amount: rzp.amount, order: rzp.order_id } }, 'razorpay payment does not match order');
      throw new AppError(400, 'PAYMENT_MISMATCH', 'Payment details do not match the order');
    }
    const partner = await tx.partner.findUnique({ where: { id: payment.partnerId } });
    const category = await tx.partnerCategory.findUnique({ where: { id: partner.categoryId } });
    const base = partner.listingExpiresAt && partner.listingExpiresAt > new Date() ? partner.listingExpiresAt : new Date();
    const validUntil = category.feeValidityDays ? new Date(base.getTime() + category.feeValidityDays * 86400_000) : null;
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'paid' } },
      data: { status: 'paid', razorpayPaymentId: rzp.id, method: rzp.method || null, paidAt: new Date(), validUntil, failureReason: null },
    });
    if (updated.count !== 1) return null;
    await tx.partner.update({ where: { id: partner.id }, data: { feePaidAt: new Date(), listingExpiresAt: validUntil } });
    return { payment: await tx.payment.findUnique({ where: { id: payment.id } }), userId: partner.userId };
  });
  if (!result) return false;
  await invalidateAuthCache(result.userId);
  await partnerService.tryComplete(result.userId);
  await partnerService.syncDriverListing(result.payment.partnerId);
  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  notify.paymentReceived(result.payment, user);
  return true;
}

/** Ask Razorpay whether an order we still think is unpaid actually got paid (missed callback + webhook). */
async function reconcile(payment) {
  if (payment.status !== 'created') return payment;
  try {
    const items = await razorpay.client.fetchOrderPayments(payment.razorpayOrderId);
    const captured = items.find((i) => i.status === 'captured');
    if (captured) await markPaid(payment.id, captured);
    else if (items.length && items.every((i) => i.status === 'failed')) {
      await prisma.payment.updateMany({ where: { id: payment.id, status: 'created' }, data: { status: 'failed', failureReason: items[0].error_description || 'Payment failed' } });
    }
  } catch (e) {
    logger.warn({ err: e.message, paymentId: payment.id }, 'reconcile failed');
  }
  return prisma.payment.findUnique({ where: { id: payment.id } });
}

// ---------------- Partner routes (/partner/payments) ----------------
const partnerRouter = express.Router();
partnerRouter.use(authenticate, requirePartner);

partnerRouter.get('/', validate({ query: z.object(pageQuery) }), async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query);
  const where = { partnerId: req.partner.id };
  const [items, total] = await Promise.all([prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }), prisma.payment.count({ where })]);
  res.json({ success: true, data: items.map(serialize), meta: pageMeta(page, limit, total) });
});

partnerRouter.post('/registration-order', async (req, res) => {
  const partner = await prisma.partner.findUnique({ where: { id: req.partner.id }, include: { user: true } });
  const category = await partnerService.categoryById(partner.categoryId);
  if (!category.registrationFee) throw badRequest('No registration fee is required for your partner type');
  const renewable = !partner.listingExpiresAt || partner.listingExpiresAt.getTime() - Date.now() < RENEW_WINDOW_DAYS * 86400_000;
  if (partnerService.feeIsValid(partner, category) && (!category.feeValidityDays || !renewable)) throw conflict('Your registration fee is already paid', 'ALREADY_PAID');

  // Reuse a recent unpaid order for the same amount (avoids duplicate orders on retries).
  let payment = await prisma.payment.findFirst({ where: { partnerId: partner.id, status: 'created', amount: category.registrationFee, createdAt: { gte: new Date(Date.now() - 3600_000) } }, orderBy: { createdAt: 'desc' } });
  if (!payment) {
    const receipt = shortCode('RCPT', 10);
    const order = await razorpay.client.createOrder({ amount: category.registrationFee, receipt, notes: { partnerId: String(partner.id), purpose: 'registration_fee', category: category.code } });
    payment = await prisma.payment.create({
      data: { userId: partner.userId, partnerId: partner.id, amount: category.registrationFee, receipt, razorpayOrderId: order.id, categoryCode: category.code },
    });
  }
  res.json({
    success: true,
    data: {
      paymentId: payment.id,
      orderId: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      keyId: razorpay.keyId(),
      name: 'GoTrip',
      description: `${category.name} registration fee`,
      prefill: { name: partner.user.fullName || '', contact: partner.user.phone, email: partner.user.email || '' },
      checkoutUrl: `${env.PUBLIC_BASE_URL}/api/v1/payments/checkout/${payment.razorpayOrderId}?t=${checkoutToken(payment.razorpayOrderId)}`,
    },
  });
});

partnerRouter.post(
  '/verify',
  validate({ body: z.object({ razorpayOrderId: z.string().min(5).max(64), razorpayPaymentId: z.string().min(5).max(64), razorpaySignature: z.string().min(10).max(128) }) }),
  async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment || payment.partnerId !== req.partner.id) throw notFound('Payment');
    if (payment.status === 'paid') return res.json({ success: true, data: { status: 'paid', payment: serialize(payment), onboarding: await partnerService.onboardingState(req.user.id) } });
    if (!razorpay.verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      logger.warn({ paymentId: payment.id }, 'invalid razorpay signature');
      throw badRequest('Payment verification failed. If money was deducted it will be confirmed automatically within a few minutes.', undefined, 'SIGNATURE_INVALID');
    }
    await prisma.payment.update({ where: { id: payment.id }, data: { razorpaySignature } });
    const rzp = await razorpay.client.fetchPayment(razorpayPaymentId);
    if (rzp.status === 'captured') await markPaid(payment.id, rzp);
    else if (rzp.status === 'failed') await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed', failureReason: rzp.error_description || 'Payment failed' } });
    const fresh = await prisma.payment.findUnique({ where: { id: payment.id } });
    res.json({ success: true, data: { status: fresh.status === 'created' ? 'processing' : fresh.status, payment: serialize(fresh), onboarding: await partnerService.onboardingState(req.user.id) } });
  }
);

partnerRouter.get('/:id/status', validate({ params: z.object({ id: z.coerce.number().int().positive() }) }), async (req, res) => {
  let payment = await prisma.payment.findFirst({ where: { id: req.params.id, partnerId: req.partner.id } });
  if (!payment) throw notFound('Payment');
  if (payment.status === 'created' && Date.now() - payment.createdAt.getTime() > 20_000) payment = await reconcile(payment);
  res.json({ success: true, data: { status: payment.status === 'created' ? 'processing' : payment.status, payment: serialize(payment), onboarding: await partnerService.onboardingState(req.user.id) } });
});

partnerRouter.post('/:id/failed', validate({ params: z.object({ id: z.coerce.number().int().positive() }), body: z.object({ reason: z.string().max(255).optional() }) }), async (req, res) => {
  // Client-reported cancel/failure: only recorded as a hint, never overrides a real payment.
  await prisma.payment.updateMany({ where: { id: req.params.id, partnerId: req.partner.id, status: 'created' }, data: { failureReason: req.body.reason?.slice(0, 255) || 'Cancelled by user' } });
  res.json({ success: true, data: { recorded: true } });
});

// ---------------- Public routes (/payments) ----------------
const publicRouter = express.Router();

/** Hosted Razorpay Checkout page for the partner app WebView (works in Expo Go, no native module needed). */
publicRouter.get('/checkout/:orderId', async (req, res) => {
  const { orderId } = req.params;
  if (!/^order_[A-Za-z0-9]+$/.test(orderId) || !safeEqual(String(req.query.t || ''), checkoutToken(orderId))) return res.status(403).send('Invalid checkout link');
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId }, include: { user: true } });
  if (!payment) return res.status(404).send('Order not found');
  const opts = {
    key: razorpay.keyId(),
    order_id: orderId,
    amount: payment.amount,
    currency: payment.currency,
    name: 'GoTrip',
    description: 'Partner registration fee',
    prefill: { name: payment.user.fullName || '', contact: payment.user.phone, email: payment.user.email || '' },
    theme: { color: '#EF4444' },
    retry: { enabled: true, max_count: 3 },
  };
  res.setHeader('Content-Security-Policy', "default-src 'self' https://*.razorpay.com; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com; frame-src https://*.razorpay.com; img-src * data:; style-src 'unsafe-inline' https://*.razorpay.com; connect-src https://*.razorpay.com");
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>GoTrip Payment</title>
<style>body{font-family:system-ui,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#334155;text-align:center}button{background:#ef4444;color:#fff;border:0;border-radius:10px;padding:14px 28px;font-size:16px;margin-top:16px}</style></head>
<body><div><p id="msg">Opening secure payment…</p><button id="retry" style="display:none" onclick="pay()">Pay ₹${(payment.amount / 100).toFixed(0)}</button></div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
var opts=${JSON.stringify(opts).replace(/</g, '\\u003c')};
function send(m){ if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(m));} }
opts.handler=function(r){ document.getElementById('msg').innerText='Payment received. Verifying…'; send({status:'success',razorpayOrderId:r.razorpay_order_id,razorpayPaymentId:r.razorpay_payment_id,razorpaySignature:r.razorpay_signature}); };
opts.modal={ondismiss:function(){ document.getElementById('msg').innerText='Payment was not completed.'; document.getElementById('retry').style.display='inline-block'; send({status:'dismissed'}); }};
function pay(){ try{ var rz=new Razorpay(opts); rz.on('payment.failed',function(r){ send({status:'failed',reason:(r.error&&r.error.description)||'Payment failed'}); }); rz.open(); }catch(e){ document.getElementById('msg').innerText='Could not load payment. Check your internet and retry.'; document.getElementById('retry').style.display='inline-block'; send({status:'error',reason:String(e)}); } }
window.onload=pay;
</script></body></html>`);
});

/** Razorpay webhook. Mounted with express.raw() so the signature is checked against the exact bytes. */
async function webhookHandler(req, res) {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!razorpay.verifyWebhookSignature(raw, req.get('x-razorpay-signature'))) return res.status(400).json({ success: false, error: { code: 'BAD_SIGNATURE', message: 'Invalid signature' } });
  const body = JSON.parse(raw);
  const eventId = req.get('x-razorpay-event-id') || `${body.event}:${body.payload?.payment?.entity?.id || body.created_at}`;
  try {
    await prisma.paymentWebhookEvent.create({ data: { eventId, event: body.event, payload: body } });
  } catch (e) {
    if (e.code === 'P2002') return res.json({ success: true, duplicate: true }); // already processed
    throw e;
  }
  const entity = body.payload?.payment?.entity;
  if (entity?.order_id) {
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: entity.order_id } });
    if (payment) {
      if ((body.event === 'payment.captured' || body.event === 'order.paid') && entity.status === 'captured') await markPaid(payment.id, entity);
      else if (body.event === 'payment.failed') await prisma.payment.updateMany({ where: { id: payment.id, status: 'created' }, data: { status: 'failed', failureReason: entity.error_description || 'Payment failed' } });
    }
  }
  res.json({ success: true });
}

module.exports = { partnerRouter, publicRouter, webhookHandler, markPaid, reconcile, serialize };
