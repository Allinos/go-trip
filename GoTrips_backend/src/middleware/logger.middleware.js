const morgan = require("morgan");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return uuidv4();
};

/**
 * Add request ID to each request
 */
const requestId = (req, res, next) => {
  req.id = generateRequestId();
  res.setHeader("X-Request-ID", req.id);
  next();
};

/**
 * Custom Morgan token for request ID
 */
morgan.token("id", (req) => req.id);

/**
 * Custom Morgan token for user ID
 */
morgan.token("user-id", (req) => req.userId || "anonymous");

/**
 * Custom Morgan token for response time in milliseconds
 */
morgan.token("response-time-ms", (req, res) => {
  if (!req._startAt || !res._startAt) {
    return "";
  }

  const ms =
    (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;

  return ms.toFixed(3);
});

/**
 * Custom Morgan token for request body (be careful with sensitive data)
 */
morgan.token("body", (req) => {
  // Don't log sensitive fields
  const sensitiveFields = [
    "password",
    "otp",
    "token",
    "refreshToken",
    "cardNumber",
    "cvv",
  ];
  const body = { ...req.body };

  sensitiveFields.forEach((field) => {
    if (body[field]) {
      body[field] = "***REDACTED***";
    }
  });

  return JSON.stringify(body);
});

/**
 * Development logging format
 */
const devFormat =
  ":method :url :status :response-time ms - :res[content-length] - ID: :id - User: :user-id";

/**
 * Production logging format
 */
const prodFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time-ms ms - ID: :id - User: :user-id';

/**
 * Create Morgan middleware with custom stream to Winston
 */
const createMorganMiddleware = () => {
  const format =
    process.env.NODE_ENV === "development" ? devFormat : prodFormat;

  return morgan(format, {
    stream: {
      write: (message) => {
        logger.http(message.trim());
      },
    },
    // Skip logging for health check endpoints in production
    skip: (req) => {
      if (process.env.NODE_ENV === "production") {
        return req.url === "/health" || req.url === "/api/health";
      }
      return false;
    },
  });
};

/**
 * Custom request logger middleware
 * Logs detailed information about requests
 */
const requestLogger = (req, res, next) => {
  // Capture start time
  req._startTime = Date.now();

  // Log request
  logger.info("Incoming request", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    userId: req.userId || null,
    query: req.query,
    // Only log body in development (and redact sensitive fields)
    body:
      process.env.NODE_ENV === "development"
        ? redactSensitiveData(req.body)
        : undefined,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const responseTime = Date.now() - req._startTime;

    // Log response
    logger.info("Outgoing response", {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.userId || null,
      contentLength: res.get("content-length"),
    });

    return res.send(data);
  };

  next();
};

/**
 * Redact sensitive data from objects
 */
const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sensitiveFields = [
    "password",
    "otp",
    "token",
    "refreshToken",
    "accessToken",
    "apiKey",
    "secret",
    "cardNumber",
    "cvv",
    "pin",
    "bankAccount",
    "ssn",
    "privateKey",
  ];

  const redacted = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (
      sensitiveFields.some((field) =>
        key.toLowerCase().includes(field.toLowerCase()),
      )
    ) {
      redacted[key] = "***REDACTED***";
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      redacted[key] = redactSensitiveData(obj[key]);
    } else {
      redacted[key] = obj[key];
    }
  }

  return redacted;
};

/**
 * Log API errors
 */
const errorLogger = (err, req, res, next) => {
  logger.error("API Error", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
    errorCode: err.code || "INTERNAL_ERROR",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    userId: req.userId || null,
    ip: req.ip,
  });

  next(err);
};

/**
 * Log slow requests (longer than threshold)
 */
const slowRequestLogger = (thresholdMs = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - startTime;

      if (duration > thresholdMs) {
        logger.warn("Slow request detected", {
          requestId: req.id,
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
          userId: req.userId || null,
          statusCode: res.statusCode,
        });
      }
    });

    next();
  };
};

/**
 * Log authentication attempts
 */
const authLogger = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Log successful authentication
    if (res.statusCode === 200 && data.success) {
      logger.info("Authentication successful", {
        requestId: req.id,
        phoneNumber: req.body.phoneNumber || "unknown",
        userId: data.data?.userId || req.userId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    // Log failed authentication
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn("Authentication failed", {
        requestId: req.id,
        phoneNumber: req.body.phoneNumber || "unknown",
        reason: data.error?.message || "Unknown",
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Log database queries (for debugging)
 */
const queryLogger = (query, params) => {
  if (process.env.LOG_QUERIES === "true") {
    logger.debug("Database query", {
      query,
      params: params ? redactSensitiveData(params) : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Log external API calls
 */
const externalApiLogger = (
  service,
  endpoint,
  method,
  responseTime,
  statusCode,
) => {
  logger.info("External API call", {
    service,
    endpoint,
    method,
    responseTime: `${responseTime}ms`,
    statusCode,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log WebSocket connections
 */
const socketLogger = {
  connection: (socketId, userId) => {
    logger.info("WebSocket connected", {
      socketId,
      userId: userId || "anonymous",
      timestamp: new Date().toISOString(),
    });
  },

  disconnect: (socketId, reason) => {
    logger.info("WebSocket disconnected", {
      socketId,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  event: (socketId, event, data) => {
    logger.debug("WebSocket event", {
      socketId,
      event,
      data: redactSensitiveData(data),
      timestamp: new Date().toISOString(),
    });
  },

  error: (socketId, error) => {
    logger.error("WebSocket error", {
      socketId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Log payment transactions
 */
const paymentLogger = {
  initiated: (transactionId, userId, amount, method) => {
    logger.info("Payment initiated", {
      transactionId,
      userId,
      amount,
      method,
      timestamp: new Date().toISOString(),
    });
  },

  success: (transactionId, gatewayResponse) => {
    logger.info("Payment successful", {
      transactionId,
      gateway: gatewayResponse.gateway,
      timestamp: new Date().toISOString(),
    });
  },

  failed: (transactionId, reason) => {
    logger.error("Payment failed", {
      transactionId,
      reason,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Performance monitoring
 */
const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime();

  res.on("finish", () => {
    const elapsed = process.hrtime(startTime);
    const elapsedMs = elapsed[0] * 1000 + elapsed[1] / 1000000;

    if (process.env.LOG_PERFORMANCE === "true") {
      logger.debug("Performance metrics", {
        requestId: req.id,
        url: req.originalUrl,
        method: req.method,
        responseTime: `${elapsedMs.toFixed(2)}ms`,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      });
    }
  });

  next();
};

module.exports = {
  // Main middleware
  requestId,
  requestLogger,
  errorLogger,
  createMorganMiddleware,

  // Specialized loggers
  slowRequestLogger,
  authLogger,
  performanceLogger,

  // Utility loggers
  queryLogger,
  externalApiLogger,
  socketLogger,
  paymentLogger,

  // Utility functions
  redactSensitiveData,
};
