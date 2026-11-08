'use strict';
const pino = require('pino');
const env = require('../config/env');

const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.otp', '*.password', '*.token', '*.refreshToken', '*.razorpaySignature'],
    censor: '[redacted]',
  },
  transport: env.isProd || env.isTest ? undefined : { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } },
});

module.exports = logger;
