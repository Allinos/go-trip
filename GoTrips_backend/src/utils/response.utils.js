/**
 * Convert BigInt to string for JSON serialization
 */
// const serializeBigInt = (obj) => {
//   if (obj === null || obj === undefined) return obj;
//   if (typeof obj === 'bigint') return obj.toString();
//   if (Array.isArray(obj)) return obj.map(serializeBigInt);
//   if (typeof obj === 'object') {
//     const result = {};
//     for (const key in obj) {
//       if (obj.hasOwnProperty(key)) {
//         result[key] = serializeBigInt(obj[key]);
//       }
//     }
//     return result;
//   }
//   return obj;
// };
const serializeBigInt = (obj) => {
  if (obj === null || obj === undefined) return obj;

  // ✅ Handle Date FIRST
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // ✅ Handle BigInt
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // ✅ Handle Array
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  // ✅ Handle Object
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }

  return obj;
};
/**
 * Standardized success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: serializeBigInt(data),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standardized error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default 500)
 * @param {String} code - Error code
 * @param {*} details - Additional error details
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination info
 */
const sendPaginated = (res, data, pagination) => {
  return res.status(200).json({
    success: true,
    data: serializeBigInt(data),
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 20)),
      hasNext: pagination.hasNext !== undefined ? pagination.hasNext : false,
      hasPrev: pagination.hasPrev !== undefined ? pagination.hasPrev : false,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Created response (201)
 */
const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * No content response (204)
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

/**
 * Not found response (404)
 */
const sendNotFound = (res, resource = 'Resource') => {
  return sendError(res, `${resource} not found`, 404, 'NOT_FOUND');
};

/**
 * Validation error response (400)
 */
const sendValidationError = (res, errors) => {
  return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors);
};

/**
 * Unauthorized response (401)
 */
const sendUnauthorized = (res, message = 'Authentication required') => {
  return sendError(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Forbidden response (403)
 */
const sendForbidden = (res, message = 'Access denied') => {
  return sendError(res, message, 403, 'FORBIDDEN');
};

/**
 * Conflict response (409)
 */
const sendConflict = (res, message = 'Resource already exists') => {
  return sendError(res, message, 409, 'CONFLICT');
};

/**
 * Rate limit exceeded response (429)
 */
const sendRateLimitExceeded = (res, retryAfter = null) => {
  return sendError(
    res,
    'Too many requests, please try again later',
    429,
    'RATE_LIMIT_EXCEEDED',
    retryAfter ? { retryAfter } : null
  );
};

/**
 * Internal server error response (500)
 */
const sendInternalError = (res, message = 'Internal server error') => {
  return sendError(res, message, 500, 'INTERNAL_ERROR');
};

/**
 * Service unavailable response (503)
 */
const sendServiceUnavailable = (res, message = 'Service temporarily unavailable') => {
  return sendError(res, message, 503, 'SERVICE_UNAVAILABLE');
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendRateLimitExceeded,
  sendInternalError,
  sendServiceUnavailable,
};