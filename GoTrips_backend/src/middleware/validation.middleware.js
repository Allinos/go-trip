const Joi = require('joi');
const { sendError } = require('../utils/response.utils');

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {String} property - Request property to validate (body, query, params)
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Get all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      console.log(error);

      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', {
        errors,
      });
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

/**
 * Validate request body
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate query parameters
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate URL parameters
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Common validation schemas
 */

// Phone number validation (international format)
const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in valid international format',
  });

// OTP validation (6 digits)
const otpSchema = Joi.string()
  .length(6)
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.length': 'OTP must be 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
  });

// Email validation
const emailSchema = Joi.string().email().lowercase().trim();

// Coordinates validation
const coordinatesSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
});

// Date validation (future dates only)
const futureDateSchema = Joi.date().min('now').required().messages({
  'date.min': 'Date must be in the future',
});

// Pagination validation
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// MongoDB/PostgreSQL ID validation
const idSchema = Joi.alternatives().try(
  Joi.number().integer().positive(), // PostgreSQL bigint
  Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
);

// File upload validation
const fileValidationSchema = Joi.object({
  mimetype: Joi.string().valid('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf').required().messages({
    'any.only': 'File type must be JPEG, PNG, WEBP, or PDF',
  }),
  size: Joi.number()
    .max(5 * 1024 * 1024) // 5MB
    .required()
    .messages({
      'number.max': 'File size must not exceed 5MB',
    }),
});

/**
 * Validate file upload in request
 */
const validateFile = (fieldName = 'file', required = true) => {
  return (req, res, next) => {
    if (!req.file && required) {
      return sendError(res, `${fieldName} is required`, 400, 'FILE_REQUIRED');
    }

    if (req.file) {
      const { error } = fileValidationSchema.validate(req.file);

      if (error) {
        return sendError(res, error.details[0].message, 400, 'INVALID_FILE');
      }
    }

    next();
  };
};

/**
 * Validate multiple files upload
 */
const validateFiles = (fieldName = 'files', minFiles = 1, maxFiles = 10) => {
  return (req, res, next) => {
    const files = req.files;

    if (!files || files.length === 0) {
      return sendError(res, `At least ${minFiles} file(s) required`, 400, 'FILES_REQUIRED');
    }

    if (files.length < minFiles) {
      return sendError(res, `At least ${minFiles} file(s) required`, 400, 'INSUFFICIENT_FILES');
    }

    if (files.length > maxFiles) {
      return sendError(res, `Maximum ${maxFiles} files allowed`, 400, 'TOO_MANY_FILES');
    }

    // Validate each file
    for (const file of files) {
      const { error } = fileValidationSchema.validate(file);
      if (error) {
        return sendError(res, `Invalid file: ${error.details[0].message}`, 400, 'INVALID_FILE');
      }
    }

    next();
  };
};

/**
 * Sanitize request data to prevent injection attacks
 */
const sanitize = (req, res, next) => {
  // Remove any $ or . characters from keys (MongoDB injection prevention)
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const key in obj) {
      const sanitizedKey = key.replace(/[$\.]/g, '');
      sanitized[sanitizedKey] = sanitizeObject(obj[key]);
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

/**
 * Custom validation function wrapper
 */
const customValidate = (validationFn) => {
  return async (req, res, next) => {
    try {
      const result = await validationFn(req);

      if (result.error) {
        return sendError(res, result.message || 'Validation failed', result.statusCode || 400, result.code || 'CUSTOM_VALIDATION_ERROR', result.details);
      }

      next();
    } catch (error) {
      console.error('Custom validation error:', error);
      return sendError(res, 'Validation failed', 500, 'VALIDATION_ERROR');
    }
  };
};

/**
 * Validate enum values
 */
const validateEnum = (field, allowedValues, location = 'body') => {
  return (req, res, next) => {
    const value = req[location][field];

    if (value && !allowedValues.includes(value)) {
      return sendError(res, `${field} must be one of: ${allowedValues.join(', ')}`, 400, 'INVALID_ENUM_VALUE');
    }

    next();
  };
};

/**
 * Check if at least one field is provided
 */
const requireAtLeastOne = (...fields) => {
  return (req, res, next) => {
    const hasAtLeastOne = fields.some((field) => {
      return req.body[field] !== undefined && req.body[field] !== null;
    });

    if (!hasAtLeastOne) {
      return sendError(res, `At least one of the following fields is required: ${fields.join(', ')}`, 400, 'MISSING_REQUIRED_FIELDS');
    }

    next();
  };
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  validateFiles,
  sanitize,
  customValidate,
  validateEnum,
  requireAtLeastOne,

  // Export common schemas for reuse
  schemas: {
    phone: phoneSchema,
    otp: otpSchema,
    email: emailSchema,
    coordinates: coordinatesSchema,
    futureDate: futureDateSchema,
    pagination: paginationSchema,
    id: idSchema,
    file: fileValidationSchema,
  },
};
