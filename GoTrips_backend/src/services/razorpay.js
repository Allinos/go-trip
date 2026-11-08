'use strict';
/**
 * Razorpay integration (Orders API + signature verification).
 * Security model:
 *  - The amount always comes from the server (partner category fee), never from the client.
 *  - Client success callback is verified with HMAC_SHA256(order_id|payment_id, key_secret).
 *  - We additionally fetch the payment from Razorpay and check order id, amount and status.
 *  - Webhooks (payment.captured / order.paid / payment.failed) are verified with the webhook secret
 *    so a payment completes even when the app is closed right after paying.
 */
const axios = require('axios');
const env = require('../config/env');
const { hmac, safeEqual } = require('../lib/util');
const { AppError } = require('../lib/errors');

const api = axios.create({ baseURL: 'https://api.razorpay.com/v1', timeout: 10000, auth: { username: env.RAZORPAY_KEY_ID, password: env.RAZORPAY_KEY_SECRET } });

function ensureConfigured() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new AppError(503, 'PAYMENTS_UNAVAILABLE', 'Online payment is not configured yet. Please try again later.');
}

const wrap = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) throw e;
    const msg = e.response?.data?.error?.description || e.message;
    throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', `Payment gateway error: ${msg}`);
  }
};

const client = {
  async createOrder({ amount, receipt, notes }) {
    ensureConfigured();
    return wrap(async () => (await api.post('/orders', { amount, currency: 'INR', receipt, notes, payment_capture: 1 })).data);
  },
  async fetchPayment(paymentId) {
    ensureConfigured();
    return wrap(async () => (await api.get(`/payments/${encodeURIComponent(paymentId)}`)).data);
  },
  async fetchOrderPayments(orderId) {
    ensureConfigured();
    return wrap(async () => (await api.get(`/orders/${encodeURIComponent(orderId)}/payments`)).data.items || []);
  },
};

const verifyCheckoutSignature = (orderId, paymentId, signature) => !!signature && safeEqual(hmac(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);

const verifyWebhookSignature = (rawBody, signature) => !!env.RAZORPAY_WEBHOOK_SECRET && !!signature && safeEqual(hmac(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

module.exports = { client, verifyCheckoutSignature, verifyWebhookSignature, keyId: () => env.RAZORPAY_KEY_ID };
