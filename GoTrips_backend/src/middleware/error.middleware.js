const logger = require("../utils/logger");

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Operational errors vs programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error classes for common scenarios
 */
class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class AuthenticationError extends ApiError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

class AuthorizationError extends ApiError {
  constructor(message = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

class ConflictError extends ApiError {
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

class RateLimitError extends ApiError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

class DatabaseError extends ApiError {
  constructor(message = "Database operation failed") {
    super(message, 500, "DATABASE_ERROR");
  }
}

class ExternalServiceError extends ApiError {
  constructor(service, message = "External service error") {
    super(`${service}: ${message}`, 503, "EXTERNAL_SERVICE_ERROR");
  }
}

/**
 * Handle Prisma/Database errors
 */
const handlePrismaError = (error) => {
  // Prisma unique constraint violation
  if (error.code === "P2002") {
    const field = error.meta?.target?.[0] || "field";
    return new ConflictError(`${field} already exists`);
  }

  // Prisma record not found
  if (error.code === "P2025") {
    return new NotFoundError("Record");
  }

  // Prisma foreign key constraint violation
  if (error.code === "P2003") {
    return new ValidationError("Invalid reference to related record");
  }

  // Prisma invalid data type
  if (error.code === "P2006" || error.code === "P2007") {
    return new ValidationError("Invalid data format");
  }

  // Prisma connection error
  if (error.code === "P1001" || error.code === "P1002") {
    return new DatabaseError("Database connection failed");
  }

  // Generic Prisma error
  if (error.code && error.code.startsWith("P")) {
    return new DatabaseError("Database operation failed");
  }

  return null;
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
  if (error.name === "JsonWebTokenError") {
    return new AuthenticationError("Invalid token");
  }

  if (error.name === "TokenExpiredError") {
    return new AuthenticationError("Token has expired");
  }

  if (error.name === "NotBeforeError") {
    return new AuthenticationError("Token not yet valid");
  }

  return null;
};

/**
 * Handle Multer (file upload) errors
 */
const handleMulterError = (error) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return new ValidationError("File size too large");
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return new ValidationError("Too many files");
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return new ValidationError("Unexpected file field");
  }

  return new ValidationError(error.message);
};

/**
 * Handle validation errors (from Joi or express-validator)
 */
const handleValidationError = (error) => {
  if (error.isJoi) {
    const details = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return new ValidationError("Validation failed", details);
  }

  return null;
};

/**
 * Development error response (includes stack trace)
 */
const sendErrorDev = (err, req, res) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    code: err.code,
    details: err.details,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message,
      details: err.details || null,
      stack: err.stack,
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};

/**
 * Production error response (no stack trace)
 */
const sendErrorProd = (err, req, res) => {
  // Log error for monitoring
  logger.error("Error:", {
    message: err.message,
    statusCode: err.statusCode,
    code: err.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId,
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || "INTERNAL_ERROR",
        message: err.message,
        details: err.details || null,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Programming or unknown error: don't leak error details
  console.error("UNKNOWN ERROR:", err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again later.",
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Set default status code and code if not present
  error.statusCode = err.statusCode || 500;
  error.code = err.code || "INTERNAL_ERROR";
  error.isOperational = err.isOperational || false;

  // Handle specific error types
  const prismaError = handlePrismaError(err);
  if (prismaError) error = prismaError;

  const jwtError = handleJWTError(err);
  if (jwtError) error = jwtError;

  const validationError = handleValidationError(err);
  if (validationError) error = validationError;

  if (err.name === "MulterError") {
    error = handleMulterError(err);
  }

  // Send appropriate error response
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Catch async errors wrapper
 * Wraps async route handlers to catch errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 - Not Found
 */
const notFound = (req, res, next) => {
  const error = new NotFoundError("Route");
  error.message = `Cannot ${req.method} ${req.originalUrl}`;
  next(error);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection:", {
      reason,
      promise,
    });

    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === "production") {
      console.error("Unhandled Rejection. Shutting down...");
      process.exit(1);
    }
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", {
      message: error.message,
      stack: error.stack,
    });

    console.error("Uncaught Exception. Shutting down...");
    process.exit(1);
  });
};

/**
 * Initialize error handlers
 */
const initializeErrorHandlers = () => {
  handleUnhandledRejection();
  handleUncaughtException();
};

module.exports = {
  // Middleware
  errorHandler,
  catchAsync,
  notFound,

  // Error classes
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,

  // Initializers
  initializeErrorHandlers,
};
