'use strict';
/**
 * Tiny cache with two backends:
 *  - Redis when REDIS_URL is set (shared across PM2 workers / servers)
 *  - In-process LRU-ish Map otherwise
 * Used for hot, rarely-changing reads (categories, settings, districts) and short-lived listing pages.
 */
const env = require('../config/env');
const logger = require('./logger');

let redis = null;
if (env.REDIS_URL && !env.isTest) {
  const Redis = require('ioredis');
  redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, enableOfflineQueue: false, lazyConnect: false });
  redis.on('error', (e) => logger.warn({ err: e.message }, 'redis error'));
}

const MAX_ENTRIES = 2000;
const mem = new Map();

function memGet(key) {
  const hit = mem.get(key);
  if (!hit) return undefined;
  if (hit.exp < Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return hit.val;
}

function memSet(key, val, ttlSec) {
  if (mem.size >= MAX_ENTRIES) mem.delete(mem.keys().next().value);
  mem.set(key, { val, exp: Date.now() + ttlSec * 1000 });
}

// Two levels: L1 = this process's memory, L2 = Redis (shared by all workers / servers).
// With Redis, L1 keeps entries only a few seconds so a change made on another worker shows up quickly.
const L1_MAX_SEC = 3;
const l1Ttl = (ttlSec) => (redis ? Math.min(ttlSec, L1_MAX_SEC) : ttlSec);

async function get(key) {
  const local = memGet(key);
  if (local !== undefined) return local;
  if (redis && redis.status === 'ready') {
    try {
      const raw = await redis.get(key);
      if (raw == null) return undefined;
      const val = JSON.parse(raw);
      memSet(key, val, L1_MAX_SEC);
      return val;
    } catch (e) {
      logger.warn({ err: e.message }, 'cache get failed');
    }
  }
  return undefined;
}

async function set(key, val, ttlSec = 60) {
  memSet(key, val, l1Ttl(ttlSec));
  if (redis && redis.status === 'ready') {
    try {
      await redis.set(key, JSON.stringify(val), 'EX', ttlSec);
    } catch (e) {
      logger.warn({ err: e.message }, 'cache set failed');
    }
  }
}

async function del(...keys) {
  for (const k of keys) mem.delete(k);
  if (redis && redis.status === 'ready' && keys.length) {
    try {
      await redis.del(...keys);
    } catch (e) {
      logger.warn({ err: e.message }, 'cache del failed');
    }
  }
}

/** Delete every key starting with prefix (memory + redis). */
async function delPrefix(prefix) {
  for (const k of [...mem.keys()]) if (k.startsWith(prefix)) mem.delete(k);
  if (redis && redis.status === 'ready') {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== '0');
    } catch (e) {
      logger.warn({ err: e.message }, 'cache delPrefix failed');
    }
  }
}

/**
 * Cache a finished JSON response: the body is serialised once and the ETag computed once,
 * so a cache hit is just "send these bytes" (no JSON.parse / stringify / hashing per request).
 * loader() returns the response object ({ success, data, meta }); return null for 404.
 */
const etagOf = (body) => `W/"${require('crypto').createHash('sha1').update(body).digest('base64').slice(0, 27)}"`;
async function sendCached(req, res, key, ttlSec, loader) {
  let hit = await get(key);
  if (hit === undefined) {
    const obj = await loader();
    if (obj == null) return false;
    const body = JSON.stringify(obj);
    hit = { b: body, e: etagOf(body) };
    await set(key, hit, ttlSec);
  }
  res.setHeader('ETag', hit.e);
  if (req.headers['if-none-match'] === hit.e) {
    res.status(304).end();
    return true;
  }
  res.type('application/json').send(hit.b);
  return true;
}

/** Read-through helper. */
async function wrap(key, ttlSec, loader) {
  const hit = await get(key);
  if (hit !== undefined) return hit;
  const val = await loader();
  await set(key, val, ttlSec);
  return val;
}

/**
 * Buffered counters: increments are kept in memory and flushed in batches (e.g. profile views),
 * so a popular profile does not cause one database write per view.
 */
const counters = new Map();
function bump(name, id, by = 1) {
  const key = `${name}:${id}`;
  counters.set(key, (counters.get(key) || 0) + by);
}
function drainCounters() {
  const out = [...counters.entries()].map(([k, n]) => {
    const i = k.lastIndexOf(':');
    return { name: k.slice(0, i), id: Number(k.slice(i + 1)), n };
  });
  counters.clear();
  return out;
}

/** Partner dashboard cache key + invalidation (bookings, trips, vehicles all change it). */
const dashKey = (partnerId) => `dash:${partnerId}`;
const invalidateDashboard = (partnerId) => (partnerId ? del(dashKey(partnerId)).catch(() => {}) : Promise.resolve());

module.exports = { get, set, del, delPrefix, wrap, sendCached, redis, bump, drainCounters, dashKey, invalidateDashboard };
