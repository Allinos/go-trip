'use strict';
const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

const handler = (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' } });

const make = (windowMs, limit, keyGenerator) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10_000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
    ...(keyGenerator ? { keyGenerator } : {}),
  });

const phoneKey = (req) => `${req.ip}|${String(req.body?.phone || '').replace(/\D/g, '').slice(-10)}`;

module.exports = {
  /** General API: 300 req / min / IP. */
  apiLimiter: make(60_000, 300),
  /** OTP send: 5 / 15 min per IP+phone. */
  otpSendLimiter: make(15 * 60_000, 5, phoneKey),
  /** OTP verify: 15 / 15 min per IP+phone (the OTP itself also locks after N attempts). */
  otpVerifyLimiter: make(15 * 60_000, 15, phoneKey),
  /** Admin login: 10 / 15 min per IP. */
  adminLoginLimiter: make(15 * 60_000, 10),
  /** Write-heavy user actions (booking requests, uploads): 60 / 10 min per IP. */
  writeLimiter: make(10 * 60_000, 60),
};
