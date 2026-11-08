'use strict';
require('dotenv').config();
const { z } = require('zod');

const bool = (def) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
  TRUST_PROXY: z.coerce.number().default(1),
  CORS_ORIGINS: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ADMIN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('30m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(60),
  ADMIN_TOKEN_TTL: z.string().default('8h'),
  OTP_SECRET: z.string().min(16),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  /** Fixed OTP for review/test accounts, e.g. "+919999999999:123456". Never set in production unless needed for store review. */
  OTP_TEST_NUMBERS: z.string().default(''),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().default('./uploads'),
  FILE_URL_SECRET: z.string().min(16),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(), // for Cloudflare R2 / MinIO
  MAX_UPLOAD_MB: z.coerce.number().default(8),

  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),

  SMS_PROVIDER: z.enum(['console', 'fast2sms', 'msg91', 'twilio']).default('console'),
  FAST2SMS_API_KEY: z.string().optional(),
  FAST2SMS_SENDER_ID: z.string().optional(),
  FAST2SMS_DLT_OTP_TEMPLATE_ID: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  MSG91_ALERT_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  EMAIL_ENABLED: bool(false),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('GoTrip <no-reply@gotrip.in>'),
  ADMIN_ALERT_EMAIL: z.string().optional(),

  FCM_ENABLED: bool(false),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  JOBS_ENABLED: bool(true),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:\n' + parsed.error.issues.map((i) => ` - ${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(1);
}

const env = parsed.data;
env.isProd = env.NODE_ENV === 'production';
env.isTest = env.NODE_ENV === 'test';
env.corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
env.otpTestNumbers = Object.fromEntries(
  env.OTP_TEST_NUMBERS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => pair.split(':'))
);

if (env.isProd) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) console.warn('[env] Razorpay keys are not configured: registration payments will fail.');
  if (env.SMS_PROVIDER === 'console') console.warn('[env] SMS_PROVIDER=console in production: OTPs will NOT be delivered.');
  if (env.STORAGE_DRIVER === 'local') console.warn('[env] STORAGE_DRIVER=local in production: use S3/R2 when running more than one server.');
}

module.exports = env;
