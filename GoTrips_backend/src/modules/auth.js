'use strict';
const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const sms = require('../services/sms');
const { signAccess } = require('../lib/jwt');
const { validate, z } = require('../lib/validate');
const { sha256, hmac, randomToken, normalizePhone, safeEqual } = require('../lib/util');
const { badRequest, unauthorized, forbidden, tooMany } = require('../lib/errors');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimit');
const { langOf } = require('../lib/i18n');
const { authenticate, invalidateAuthCache } = require('../middleware/auth');
const { serializeUser } = require('./users');
const partnerService = require('./partners/service');

const router = express.Router();

const otpHash = (phone, code) => hmac(env.OTP_SECRET, `${phone}:${code}`);
const phoneField = z.string().trim().max(16).transform((v, ctx) => {
  try {
    return normalizePhone(v);
  } catch (e) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
    return z.NEVER;
  }
});
const appField = z.enum(['user', 'partner']).default('user');
const langField = z.enum(['en', 'as']).optional();

async function issueSession(user, app, deviceInfo) {
  const refreshToken = randomToken(48);
  await prisma.session.create({
    data: { userId: user.id, app, tokenHash: sha256(refreshToken), deviceInfo: deviceInfo?.slice(0, 255), expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400_000) },
  });
  return { accessToken: signAccess(user, app), refreshToken, expiresIn: env.ACCESS_TOKEN_TTL };
}

async function authPayload(user, app) {
  const payload = { user: await serializeUser(user), profileComplete: !!user.fullName };
  if (app === 'partner') payload.onboarding = await partnerService.onboardingState(user.id);
  return payload;
}

// POST /auth/otp/send
router.post('/otp/send', otpSendLimiter, validate({ body: z.object({ phone: phoneField, app: appField, language: langField }) }), async (req, res) => {
  const { phone } = req.body;
  const lang = req.body.language || langOf(req);
  const last = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  if (last && Date.now() - last.createdAt.getTime() < 30_000) throw tooMany('Please wait 30 seconds before requesting another code');
  const today = await prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 86400_000) } } });
  if (today >= 10) throw tooMany('Too many codes requested today. Please try again tomorrow.');

  const existing = await prisma.user.findUnique({ where: { phone }, select: { status: true } });
  if (existing?.status === 'blocked') throw forbidden('This account is blocked. Please contact support.', 'ACCOUNT_BLOCKED');

  const testCode = env.otpTestNumbers[phone];
  const code = testCode || String(crypto.randomInt(100000, 1000000));
  // Invalidate earlier unused codes so only the latest one works.
  await prisma.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.otpCode.create({ data: { phone, codeHash: otpHash(phone, code), expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000) } });
  if (!testCode) {
    try {
      await sms.sendOtp(phone, code, lang);
    } catch {
      throw badRequest('Could not send the SMS right now. Please try again.', undefined, 'SMS_FAILED');
    }
  }
  res.json({ success: true, data: { phone, isRegistered: !!existing, expiresIn: env.OTP_TTL_SECONDS, resendAfter: 30, ...(env.SMS_PROVIDER === 'console' && !env.isProd ? { devOtp: code } : {}) } });
});

// POST /auth/otp/verify
router.post(
  '/otp/verify',
  otpVerifyLimiter,
  validate({ body: z.object({ phone: phoneField, otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'), app: appField, deviceInfo: z.string().max(255).optional(), language: langField }) }),
  async (req, res) => {
    const { phone, otp, app, deviceInfo, language } = req.body;
    const rec = await prisma.otpCode.findFirst({ where: { phone, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!rec || rec.expiresAt < new Date()) throw badRequest('The code has expired. Please request a new one.', undefined, 'OTP_EXPIRED');
    if (rec.attempts >= env.OTP_MAX_ATTEMPTS) throw tooMany('Too many wrong attempts. Please request a new code.');

    if (!safeEqual(rec.codeHash, otpHash(phone, otp))) {
      await prisma.otpCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
      const left = env.OTP_MAX_ATTEMPTS - rec.attempts - 1;
      throw badRequest(left > 0 ? `Incorrect code. ${left} attempt(s) left.` : 'Incorrect code. Please request a new one.', undefined, 'OTP_INVALID');
    }
    // Atomic consume: protects against the same code being used twice concurrently.
    const consumed = await prisma.otpCode.updateMany({ where: { id: rec.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) throw badRequest('This code was already used. Please request a new one.', undefined, 'OTP_USED');

    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;
    if (!user) user = await prisma.user.create({ data: { phone, language: language || langOf(req) } });
    if (user.status === 'blocked') throw forbidden('This account is blocked. Please contact support.', 'ACCOUNT_BLOCKED');
    user = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), ...(language ? { language } : {}) } });

    const tokens = await issueSession(user, app, deviceInfo || req.get('user-agent'));
    res.json({ success: true, data: { ...tokens, isNewUser, ...(await authPayload(user, app)) } });
  }
);

// POST /auth/refresh  (rotating refresh tokens with reuse detection)
router.post('/refresh', validate({ body: z.object({ refreshToken: z.string().min(20).max(200) }) }), async (req, res) => {
  const tokenHash = sha256(req.body.refreshToken);
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session) throw unauthorized('Session not found', 'INVALID_REFRESH');
  if (session.revokedAt) {
    // A rotated token was replayed: possible theft. Revoke every session of this user.
    await prisma.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    throw unauthorized('Session expired, please log in again', 'REFRESH_REUSED');
  }
  if (session.expiresAt < new Date()) throw unauthorized('Session expired, please log in again', 'REFRESH_EXPIRED');
  if (session.user.status === 'blocked') throw forbidden('This account is blocked', 'ACCOUNT_BLOCKED');

  const revoked = await prisma.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (revoked.count !== 1) throw unauthorized('Session expired, please log in again', 'REFRESH_REUSED');
  const tokens = await issueSession(session.user, session.app, session.deviceInfo);
  res.json({ success: true, data: tokens });
});

// POST /auth/logout
router.post('/logout', validate({ body: z.object({ refreshToken: z.string().max(200).optional(), pushToken: z.string().max(255).optional() }) }), async (req, res) => {
  if (req.body.refreshToken) await prisma.session.updateMany({ where: { tokenHash: sha256(req.body.refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  if (req.body.pushToken) await prisma.pushToken.updateMany({ where: { token: req.body.pushToken }, data: { isActive: false } });
  res.json({ success: true, data: { loggedOut: true } });
});

// POST /auth/logout-all
router.post('/logout-all', authenticate, async (req, res) => {
  await prisma.session.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await invalidateAuthCache(req.user.id);
  res.json({ success: true, data: { loggedOut: true } });
});

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ success: true, data: await authPayload(user, req.app_kind) });
});

module.exports = router;
