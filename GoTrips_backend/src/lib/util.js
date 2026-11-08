'use strict';
const crypto = require('crypto');
const { badRequest } = require('./errors');

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const hmac = (secret, s) => crypto.createHmac('sha256', secret).update(String(s)).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Normalise an Indian mobile number to +91XXXXXXXXXX. */
function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  let local = digits;
  if (digits.length === 12 && digits.startsWith('91')) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) local = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(local)) throw badRequest('Enter a valid 10-digit mobile number', undefined, 'INVALID_PHONE');
  return `+91${local}`;
}

const placeKey = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Short human-friendly reference, e.g. "GT7K2P9Q". No ambiguous chars. */
function shortCode(prefix = 'GT', len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = prefix;
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function paginate(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

const pageMeta = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) || 0 });

const mapsUrl = (lat, lng) => (lat == null || lng == null ? null : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
const mapsDirectionsUrl = (from, to) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;

/** Mask a phone for logs: +91******3210 */
const maskPhone = (p) => (p ? `${p.slice(0, 3)}******${p.slice(-4)}` : p);

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

module.exports = { sha256, hmac, randomToken, safeEqual, normalizePhone, placeKey, shortCode, paginate, pageMeta, mapsUrl, mapsDirectionsUrl, maskPhone, haversineKm, startOfDay };
