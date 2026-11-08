const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`,
  ),
);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "info";
};

// Create transports array
const transports = [];

// Console transport (always active)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === "development" ? consoleFormat : logFormat,
  }),
);

// File transport for errors
transports.push(
  new DailyRotateFile({
    filename: path.join("logs", "error", "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    maxFiles: "30d", // Keep logs for 30 days
    maxSize: "20m", // Rotate if file size exceeds 20MB
    format: logFormat,
  }),
);

// File transport for all logs
transports.push(
  new DailyRotateFile({
    filename: path.join("logs", "combined", "combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxFiles: "14d", // Keep logs for 14 days
    maxSize: "20m",
    format: logFormat,
  }),
);

// File transport for HTTP logs
transports.push(
  new DailyRotateFile({
    filename: path.join("logs", "http", "http-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "http",
    maxFiles: "7d", // Keep HTTP logs for 7 days
    maxSize: "20m",
    format: logFormat,
  }),
);

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "development" ? consoleFormat : logFormat,
    }),
    new DailyRotateFile({
      filename: path.join("logs", "exceptions", "exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "development" ? consoleFormat : logFormat,
    }),
    new DailyRotateFile({
      filename: path.join("logs", "rejections", "rejections-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.logRequest = (req, message = "Request") => {
  logger.info(message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.userId || null,
  });
};

logger.logResponse = (req, res, message = "Response") => {
  logger.info(message, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    userId: req.userId || null,
  });
};

logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    code: error.code || null,
  };

  if (req) {
    errorLog.method = req.method;
    errorLog.url = req.originalUrl;
    errorLog.ip = req.ip;
    errorLog.userId = req.userId || null;
  }

  logger.error("Application Error", errorLog);
};

logger.logDatabase = (operation, table, details = {}) => {
  logger.debug("Database Operation", {
    operation,
    table,
    ...details,
  });
};

logger.logExternalAPI = (service, endpoint, method, statusCode, duration) => {
  logger.info("External API Call", {
    service,
    endpoint,
    method,
    statusCode,
    duration: `${duration}ms`,
  });
};

logger.logAuth = (action, userId, success, details = {}) => {
  logger.info("Authentication Event", {
    action,
    userId,
    success,
    ...details,
  });
};

logger.logPayment = (transactionId, amount, status, details = {}) => {
  logger.info("Payment Event", {
    transactionId,
    amount,
    status,
    ...details,
  });
};

logger.logSecurity = (event, severity, details = {}) => {
  const logMethod =
    severity === "high" ? "error" : severity === "medium" ? "warn" : "info";
  logger[logMethod]("Security Event", {
    event,
    severity,
    ...details,
  });
};

// Log startup message
if (process.env.NODE_ENV !== "test") {
  logger.info("Logger initialized", {
    environment: process.env.NODE_ENV || "development",
    level: level(),
  });
}

module.exports = logger;
