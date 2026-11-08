'use strict';
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { verifyAccess, verifyAdmin } = require('../lib/jwt');
const { unauthorized, forbidden } = require('../lib/errors');

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

const userCacheKey = (id) => `auth:user:${id}`;
const partnerCacheKey = (userId) => `auth:partner:${userId}`;

/** Call whenever user status / partner state changes so auth checks see it immediately. */
async function invalidateAuthCache(userId) {
  await cache.del(userCacheKey(userId), partnerCacheKey(userId));
}

async function loadUser(id) {
  return cache.wrap(userCacheKey(id), 60, () => prisma.user.findUnique({ where: { id }, select: { id: true, phone: true, fullName: true, email: true, status: true } }));
}

function decode(token) {
  try {
    return verifyAccess(token);
  } catch (e) {
    throw unauthorized(e.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid session', e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
  }
}

/** Requires a valid user/partner access token. */
async function authenticate(req, _res, next) {
  const token = bearer(req);
  if (!token) throw unauthorized('Please log in to continue');
  const payload = decode(token);
  const user = await loadUser(Number(payload.sub));
  if (!user) throw unauthorized('Account not found', 'USER_NOT_FOUND');
  if (user.status === 'blocked') throw forbidden('Your account has been blocked. Please contact support.', 'ACCOUNT_BLOCKED');
  req.user = user;
  req.app_kind = payload.app;
  next();
}

/** Attaches req.user when a valid token is present, never fails. */
async function optionalAuth(req, _res, next) {
  const token = bearer(req);
  if (token) {
    try {
      const payload = verifyAccess(token);
      const user = await loadUser(Number(payload.sub));
      if (user && user.status === 'active') req.user = user;
    } catch {
      /* ignore */
    }
  }
  next();
}

async function loadPartner(userId) {
  return cache.wrap(partnerCacheKey(userId), 30, () =>
    prisma.partner.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        accountStatus: true,
        verificationStatus: true,
        listingExpiresAt: true,
        category: { select: { id: true, code: true, name: true, hasDriverProfile: true, canListVehicles: true, canCreateTrips: true, canListRentals: true, canViewGoodsOrders: true, registrationFee: true } },
      },
    })
  );
}

/** Partner record must exist (any onboarding state). */
async function requirePartner(req, _res, next) {
  if (!req.user) throw unauthorized();
  const partner = await loadPartner(req.user.id);
  if (!partner) throw forbidden('Partner registration not started', 'NOT_A_PARTNER');
  if (partner.accountStatus === 'suspended') throw forbidden('Your partner account is suspended. Please contact support.', 'PARTNER_SUSPENDED');
  req.partner = partner;
  next();
}

/** Partner must have finished registration (profile + documents + fee). */
async function requireActivePartner(req, res, next) {
  await requirePartner(req, res, () => {});
  if (req.partner.accountStatus !== 'active') throw forbidden('Please complete your registration first', 'REGISTRATION_INCOMPLETE');
  next();
}

const requireCapability = (cap) => (req, _res, next) => {
  if (!req.partner?.category?.[cap]) throw forbidden('This feature is not available for your partner type', 'CAPABILITY_MISSING');
  next();
};

/** Admin panel auth. roles = allowed AdminRole values (empty = any admin). */
const requireAdmin =
  (...roles) =>
  async (req, _res, next) => {
    const token = bearer(req);
    if (!token) throw unauthorized('Admin login required');
    let payload;
    try {
      payload = verifyAdmin(token);
    } catch {
      throw unauthorized('Admin session expired', 'TOKEN_EXPIRED');
    }
    const admin = await cache.wrap(`auth:admin:${payload.sub}`, 30, () =>
      prisma.adminUser.findUnique({ where: { id: Number(payload.sub) }, select: { id: true, email: true, name: true, role: true, isActive: true, tokenVersion: true } })
    );
    if (!admin || !admin.isActive || admin.tokenVersion !== payload.ver) throw unauthorized('Admin session is no longer valid');
    if (roles.length && !roles.includes(admin.role)) throw forbidden('Your admin role cannot perform this action');
    req.admin = admin;
    next();
  };

module.exports = { authenticate, optionalAuth, requirePartner, requireActivePartner, requireCapability, requireAdmin, invalidateAuthCache, loadPartner };
