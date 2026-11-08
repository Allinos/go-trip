'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const pinoHttp = require('pino-http');
const crypto = require('crypto');
const env = require('./src/config/env');
const logger = require('./src/lib/logger');
const prisma = require('./src/lib/prisma');
const routes = require('./src/routes');
const storage = require('./src/services/storage');
const { webhookHandler } = require('./src/modules/payments');
const { apiLimiter } = require('./src/middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./src/middleware/error');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY); // correct client IPs behind nginx / load balancer

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url === '/health' },
    customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    serializers: { req: (r) => ({ id: r.id, method: r.method, url: r.url }), res: (r) => ({ statusCode: r.statusCode }) },
  })
);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Mobile apps send no Origin header; browsers (admin panel) must be on the allow-list.
app.use(cors({ origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)), credentials: false, maxAge: 86400 }));
app.use(compression());

// Razorpay webhook needs the raw body for signature verification: register before express.json().
app.post('/api/v1/payments/webhook/razorpay', express.raw({ type: '*/*', limit: '1mb' }), webhookHandler);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), storage: storage.driver });
  } catch {
    res.status(503).json({ status: 'db_unavailable' });
  }
});

if (storage.driver === 'local') app.get('/files/*key', storage.serveLocal);

app.use('/api/v1', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
