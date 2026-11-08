'use strict';
/**
 * Flushes buffered counters (profile views, call taps) to Postgres every 30 s.
 * Runs in EVERY process (each PM2 worker keeps its own in-memory buffer).
 */
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const logger = require('../lib/logger');

const COLUMNS = { driverViews: 'view_count', driverCalls: 'call_count' };

async function flush() {
  const items = cache.drainCounters();
  for (const [name, column] of Object.entries(COLUMNS)) {
    const rows = items.filter((i) => i.name === name);
    if (!rows.length) continue;
    const ids = rows.map((r) => r.id);
    const ns = rows.map((r) => r.n);
    try {
      // One statement for the whole batch.
      await prisma.$executeRawUnsafe(
        `UPDATE driver_profiles d SET ${column} = d.${column} + x.n FROM unnest($1::int[], $2::int[]) AS x(id, n) WHERE d.id = x.id`,
        ids,
        ns
      );
    } catch (e) {
      logger.warn({ err: e.message, name }, 'counter flush failed');
    }
  }
}

let timer = null;
const start = () => (timer = setInterval(flush, 30_000));
const stop = async () => {
  clearInterval(timer);
  await flush();
};

module.exports = { start, stop, flush };
