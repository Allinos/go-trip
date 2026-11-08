const jwt = require('jsonwebtoken');

/**
 * Generate access token
 * @param {Object} payload - Data to encode in token
 * @param {String} expiresIn - Token expiry (default from env)
 */

const generateAccessToken = (payload, expiresIn = null) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresIn || process.env.JWT_EXPIRE || '15d',
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - Data to encode in token
 * @param {String} expiresIn - Token expiry (default from env)
 */
const generateRefreshToken = (payload, expiresIn = null) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: expiresIn || process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 */
const generateTokenPair = (user) => {
  // Convert potential BigInts to strings
  const payload = {
    userId: String(user.user_id), 
    phoneNumber: String(user.phone_number), 
    userType: user.user_type,
  };

  const accessToken = generateAccessToken(payload);
  
  // Make sure to stringify the userId for the refresh token too!
  const refreshToken = generateRefreshToken({ userId: String(user.user_id) });

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRE || '15d',
  };
};

/**
 * Verify access token
 * @param {String} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {String} token - Refresh token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw error;
  }
};

/**
 * Decode token without verification (useful for debugging)
 * @param {String} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} - Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Check if token is expired
 * @param {String} token - JWT token
 * @returns {Boolean} - True if expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiry time
 * @param {String} token - JWT token
 * @returns {Date|null} - Expiry date or null
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Get remaining token lifetime in seconds
 * @param {String} token - JWT token
 * @returns {Number|null} - Seconds until expiry or null
 */
const getTokenLifetime = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - now);
  } catch (error) {
    return null;
  }
};

/**
 * Generate temporary token for specific actions (email verification, password reset)
 * @param {Object} payload - Data to encode
 * @param {String} expiresIn - Token expiry (e.g., '15m', '1h')
 */
const generateTemporaryToken = (payload, expiresIn = '15m') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify temporary token
 * @param {String} token - Temporary token
 * @returns {Object} - Decoded payload
 */
const verifyTemporaryToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiry,
  getTokenLifetime,
  generateTemporaryToken,
  verifyTemporaryToken,
};