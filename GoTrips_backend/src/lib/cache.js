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

async function get(key) {
  if (redis && redis.status === 'ready') {
    try {
      const raw = await redis.get(key);
      return raw == null ? undefined : JSON.parse(raw);
    } catch (e) {
      logger.warn({ err: e.message }, 'cache get failed');
    }
  }
  return memGet(key);
}

async function set(key, val, ttlSec = 60) {
  memSet(key, val, ttlSec);
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

/** Read-through helper. */
async function wrap(key, ttlSec, loader) {
  const hit = await get(key);
  if (hit !== undefined) return hit;
  const val = await loader();
  await set(key, val, ttlSec);
  return val;
}

module.exports = { get, set, del, delPrefix, wrap, redis };
