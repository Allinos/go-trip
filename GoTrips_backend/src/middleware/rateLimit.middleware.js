const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const { sendError } = require('../utils/response.utils');

/**
 * Custom rate limit exceeded handler
 */
const rateLimitHandler = (req, res) => {
  return sendError(
    res,
    'Too many requests, please try again later',
    429,
    'RATE_LIMIT_EXCEEDED',
    {
      retryAfter: req.rateLimit.resetTime,
    }
  );
};

/**
 * Custom key generator - can use userId if authenticated
 */
const keyGenerator = (req) => {
  // Use user ID if authenticated, otherwise use IP
  return req.userId ? `user:${req.userId}` : `ip:${req.ip}`;
};

/**
 * Skip rate limiting for certain conditions
 */
const skipSuccessfulRequests = (req, res) => {
  // Only count failed requests
  return res.statusCode < 400;
};

const skipFailedRequests = (req, res) => {
  // Only count successful requests
  return res.statusCode >= 400;
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Authentication rate limiter
 * 5 requests per 15 minutes (strict for login/OTP)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Only count failed login attempts
  // keyGenerator: (req) => {
  //   // Use phone number if provided, otherwise IP
  //   return req.body.phoneNumber || req.ip;
  // },
});

/**
 * OTP request rate limiter
 * 3 OTP requests per 10 minutes per phone number
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Max 3 OTP requests
  message: 'Too many OTP requests, please try again after 10 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator: (req) => {
  //   // Rate limit by phone number
  //   return `otp:${req.body.phoneNumber || req.ip}`;
  // },
});

/**
 * Search/Query rate limiter
 * 30 searches per minute
 */
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Booking/Transaction rate limiter
 * 10 bookings per hour
 */
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many booking attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Payment rate limiter
 * 5 payment attempts per 10 minutes
 */
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: 'Too many payment attempts, please contact support if you need assistance',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * File upload rate limiter
 * 20 uploads per hour
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Review/Rating rate limiter
 * 10 reviews per day
 */
const reviewLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  message: 'Too many reviews submitted, please try again tomorrow',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Support ticket rate limiter
 * 5 tickets per day
 */
const supportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  message: 'Too many support tickets, please wait before creating another',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Password reset rate limiter
 * 3 attempts per hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator: (req) => {
  //   return `reset:${req.body.email || req.body.phoneNumber || req.ip}`;
  // },
});

/**
 * Strict rate limiter for sensitive operations
 * 3 requests per hour
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many requests for this sensitive operation',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Location update rate limiter (for live tracking)
 * 120 updates per minute (every 0.5 seconds)
 */
const locationUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  message: 'Too many location updates',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Rate limit by ride ID and user
    return `location:${req.params.rideId}:${req.userId}`;
  },
});

/**
 * Notification send rate limiter
 * 50 notifications per hour per user
 */
const notificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many notifications sent',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limiter options
 */
const createCustomLimiter = (options) => {
  const defaultOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    // keyGenerator,
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Dynamic rate limiter based on user type
 */
const dynamicLimiter = (limits) => {
  return (req, res, next) => {
    // Default limits
    let max = limits.default || 100;
    let windowMs = 15 * 60 * 1000; // 15 minutes

    // Adjust based on user type if authenticated
    if (req.user) {
      if (req.user.userType === 'partner' && limits.partner) {
        max = limits.partner;
      } else if (limits.authenticated) {
        max = limits.authenticated;
      }
    }

    const limiter = createCustomLimiter({ windowMs, max });
    limiter(req, res, next);
  };
};

/**
 * IP-based rate limiter (ignores authentication)
 */
const ipLimiter = (max = 100, windowMs = 15 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    keyGenerator: (req) => ipKeyGenerator(req), // Always use IP
  });
};

/**
 * Exponential backoff rate limiter
 * Increases delay after each failed attempt
 */
const exponentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator,
  // Custom store could implement exponential backoff
});

module.exports = {
  // Pre-configured limiters
  generalLimiter,
  authLimiter,
  otpLimiter,
  searchLimiter,
  bookingLimiter,
  paymentLimiter,
  uploadLimiter,
  reviewLimiter,
  supportLimiter,
  passwordResetLimiter,
  strictLimiter,
  locationUpdateLimiter,
  notificationLimiter,

  // Custom limiters
  createCustomLimiter,
  dynamicLimiter,
  ipLimiter,
  exponentialLimiter,

  // Utility functions
  skipSuccessfulRequests,
  skipFailedRequests,
};