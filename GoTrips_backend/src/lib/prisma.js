'use strict';
const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');
const logger = require('./logger');

/**
 * One PrismaClient per process. Pool size is controlled through DATABASE_URL:
 *   ?connection_limit=20&pool_timeout=10
 * With PM2 cluster mode keep (instances x connection_limit) below Postgres max_connections,
 * or put PgBouncer in front (then add &pgbouncer=true).
 */
const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e) => logger.warn({ prisma: e.message }, 'prisma warning'));
prisma.$on('error', (e) => logger.error({ prisma: e.message }, 'prisma error'));

if (!env.isProd && !env.isTest && process.env.PRISMA_LOG_SLOW) {
  prisma.$on('query', (e) => e.duration > 200 && logger.warn({ ms: e.duration, query: e.query }, 'slow query'));
}

module.exports = prisma;
