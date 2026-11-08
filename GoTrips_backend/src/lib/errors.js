'use strict';

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}

const badRequest = (message, details, code = 'BAD_REQUEST') => new AppError(400, code, message, details);
const unauthorized = (message = 'Please log in again', code = 'UNAUTHORIZED') => new AppError(401, code, message);
const forbidden = (message = 'You do not have access to this', code = 'FORBIDDEN') => new AppError(403, code, message);
const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);
const tooMany = (message = 'Too many requests, please try again later') => new AppError(429, 'RATE_LIMITED', message);
const featureDisabled = (message = 'This feature is not available yet') => new AppError(403, 'FEATURE_DISABLED', message);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany, featureDisabled };
