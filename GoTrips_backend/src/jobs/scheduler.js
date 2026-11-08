'use strict';
/**
 * Lightweight background jobs (no extra infrastructure).
 * Each job takes a Postgres advisory lock, so with PM2 cluster / several servers only one instance runs it.
 */
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const notify = require('../services/notify');
const settings = require('../services/settings');
const partnerService = require('../modules/partners/service');
const payments = require('../modules/payments');

async function withLock(id, fn) {
  const [{ locked }] = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${id}) AS locked`;
  if (!locked) return;
  try {
    await fn();
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${id})`;
  }
}

const jobs = {
  /** Close out trips: expire unanswered requests after departure, auto-complete trips 24h after departure. */
  async trips() {
    const now = new Date();
    const expiryMin = Number(await settings.get('booking_request_expiry_minutes')) || 0;
    const expired = await prisma.booking.updateMany({ where: { status: 'pending', trip: { departureAt: { lt: now } } }, data: { status: 'expired', statusReason: 'No response before departure', cancelledBy: 'system' } });
    let stale = { count: 0 };
    if (expiryMin > 0) stale = await prisma.booking.updateMany({ where: { status: 'pending', createdAt: { lt: new Date(now - expiryMin * 60_000) } }, data: { status: 'expired', statusReason: 'Partner did not respond in time', cancelledBy: 'system' } });
    const cutoff = new Date(now - 24 * 3600_000);
    const old = await prisma.trip.findMany({ where: { status: { in: ['scheduled', 'ongoing'] }, departureAt: { lt: cutoff } }, select: { id: true } });
    for (const t of old) {
      await prisma.$transaction([
        prisma.booking.updateMany({ where: { tripId: t.id, status: 'accepted' }, data: { status: 'completed', completedAt: now } }),
        prisma.trip.update({ where: { id: t.id }, data: { status: 'completed', completedAt: now, bookingOpen: false } }),
      ]);
    }
    if (expired.count || stale.count || old.length) logger.info({ expired: expired.count + stale.count, autoCompleted: old.length }, 'job:trips');
  },

  /** Stop expired location shares. */
  async locations() {
    await prisma.locationShare.updateMany({ where: { isSharing: true, expiresAt: { lt: new Date() } }, data: { isSharing: false } });
  },

  /** Unlist drivers whose paid listing expired; remind 3 days before expiry. */
  async listings() {
    const now = new Date();
    const expired = await prisma.partner.findMany({ where: { listingExpiresAt: { lt: now }, driverProfile: { isListed: true } }, select: { id: true } });
    for (const p of expired) await partnerService.syncDriverListing(p.id);
    const soon = await prisma.partner.findMany({
      where: { listingExpiresAt: { gte: new Date(now.getTime() + 3 * 86400_000 - 3600_000), lt: new Date(now.getTime() + 3 * 86400_000) } },
      select: { userId: true, listingExpiresAt: true },
    });
    soon.forEach((p) => notify.listingExpiring(p.userId, p.listingExpiresAt));
  },

  /** Recover payments whose callback and webhook were both missed. */
  async payments() {
    const pending = await prisma.payment.findMany({ where: { status: 'created', createdAt: { lt: new Date(Date.now() - 5 * 60_000), gt: new Date(Date.now() - 48 * 3600_000) } }, take: 50 });
    for (const p of pending) await payments.reconcile(p);
  },

  /** Housekeeping: old OTPs, revoked sessions, read notifications older than 90 days. */
  async cleanup() {
    const now = Date.now();
    await prisma.otpCode.deleteMany({ where: { createdAt: { lt: new Date(now - 2 * 86400_000) } } });
    await prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: new Date(now - 7 * 86400_000) } }] } });
    await prisma.notification.deleteMany({ where: { createdAt: { lt: new Date(now - 90 * 86400_000) }, readAt: { not: null } } });
  },
};

const schedule = [
  ['trips', 5 * 60_000, 9001],
  ['locations', 5 * 60_000, 9002],
  ['listings', 60 * 60_000, 9003],
  ['payments', 10 * 60_000, 9004],
  ['cleanup', 6 * 3600_000, 9005],
];

const timers = [];
function start() {
  for (const [name, every, lockId] of schedule) {
    const run = () => withLock(lockId, jobs[name]).catch((e) => logger.error({ err: e.message, job: name }, 'job failed'));
    timers.push(setTimeout(run, 15_000 + Math.random() * 15_000));
    timers.push(setInterval(run, every));
  }
  logger.info('background jobs scheduled');
}
const stop = () => timers.forEach(clearInterval);

module.exports = { start, stop, jobs };
