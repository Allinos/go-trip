'use strict';
/** Runtime settings / feature flags stored in app_settings, cached for 60s. */
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');

const DEFAULTS = {
  goods_orders_enabled: false, // Goods transport orders: built but switched OFF.
  driver_listing_requires_approval: false, // false: drivers are listed right after paying; admin approval adds the "Verified" badge.
  sms_booking_alerts: true, // SMS the partner when a booking request arrives (in addition to push).
  booking_request_expiry_minutes: 0, // 0 = pending requests expire only when the trip departs.
  location_share_max_hours: 12,
  support_phone: '+910000000000',
  support_email: 'support@gotrip.in',
  min_app_version_user: '1.0.0',
  min_app_version_partner: '1.0.0',
};

const KEY = 'settings:all';

async function all() {
  return cache.wrap(KEY, 60, async () => {
    const rows = await prisma.appSetting.findMany();
    const out = { ...DEFAULTS };
    for (const r of rows) out[r.key] = r.value;
    return out;
  });
}

async function get(key) {
  return (await all())[key];
}

async function update(patch) {
  const keys = Object.keys(patch).filter((k) => k in DEFAULTS);
  await prisma.$transaction(keys.map((key) => prisma.appSetting.upsert({ where: { key }, create: { key, value: patch[key] }, update: { value: patch[key] } })));
  await cache.del(KEY);
  await cache.delPrefix('catalog:config:');
  return all();
}

/** Settings that are safe to expose to the apps. */
async function publicSettings() {
  const s = await all();
  return {
    features: { goodsOrders: !!s.goods_orders_enabled },
    supportPhone: s.support_phone,
    supportEmail: s.support_email,
    locationShareMaxHours: s.location_share_max_hours,
    minAppVersion: { user: s.min_app_version_user, partner: s.min_app_version_partner },
  };
}

module.exports = { all, get, update, publicSettings, DEFAULTS };
