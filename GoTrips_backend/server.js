'use strict';
const env = require('./src/config/env');
const logger = require('./src/lib/logger');
const prisma = require('./src/lib/prisma');
const app = require('./app');
const jobs = require('./src/jobs/scheduler');

const server = app.listen(env.PORT, () => logger.info(`GoTrip API listening on :${env.PORT} (${env.NODE_ENV})`));
// Keep-alive slightly above typical load balancer idle timeout (60s) to avoid 502s.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// With PM2 cluster mode, only instance 0 schedules jobs (advisory locks protect multi-server setups too).
if (env.JOBS_ENABLED && (process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0')) jobs.start();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down`);
  jobs.stop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
