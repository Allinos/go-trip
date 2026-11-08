'use strict';
const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');
const logger = require('../lib/logger');

const handler = (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' } });

// With Redis, counters are shared by every PM2 worker / server, so limits stay correct when scaled out.
// Own connection: the store loads its Lua scripts at startup, so commands must queue until Redis is
// connected (the cache client deliberately fails fast instead).
let RedisStore = null;
let rlRedis = null;
if (env.REDIS_URL && !env.isTest) {
  ({ RedisStore } = require('rate-limit-redis'));
  const Redis = require('ioredis');
  rlRedis = new Redis(env.REDIS_URL, { enableOfflineQueue: true, maxRetriesPerRequest: 2 });
  rlRedis.on('error', (e) => logger.warn({ err: e.message }, 'rate-limit redis error'));
}
const store = (prefix) => (RedisStore ? new RedisStore({ prefix: `rl:${prefix}:`, sendCommand: (...args) => rlRedis.call(...args) }) : undefined);

const make = (name, windowMs, limit, keyGenerator) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10_000 : Math.round(limit * env.RATE_LIMIT_MULTIPLIER),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
    store: store(name),
    // A failing Redis must not take the API down: allow the request.
    passOnStoreError: true,
    ...(keyGenerator ? { keyGenerator } : {}),
  });

const phoneKey = (req) => `${req.ip}|${String(req.body?.phone || '').replace(/\D/g, '').slice(-10)}`;

module.exports = {
  /** General API: 300 req / min / IP (×RATE_LIMIT_MULTIPLIER). Mobile users behind one carrier NAT share an IP, keep it generous. */
  apiLimiter: make('api', 60_000, 300),
  /** OTP send: 5 / 15 min per IP+phone. */
  otpSendLimiter: make('otp', 15 * 60_000, 5, phoneKey),
  /** OTP verify: 15 / 15 min per IP+phone (the OTP itself also locks after N attempts). */
  otpVerifyLimiter: make('otpv', 15 * 60_000, 15, phoneKey),
  /** Admin login: 10 / 15 min per IP. */
  adminLoginLimiter: make('admin', 15 * 60_000, 10),
  /** Write-heavy user actions (booking requests, uploads): 60 / 10 min per IP. */
  writeLimiter: make('write', 10 * 60_000, 60),
};
