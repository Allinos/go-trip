const jwt = require("jsonwebtoken");
const prisma = require("../config/database");
const { sendError } = require("../utils/response.utils");

/**
 * Verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Access token is required", 401, "UNAUTHORIZED");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return sendError(res, "Token has expired", 401, "TOKEN_EXPIRED");
      }
      if (error.name === "JsonWebTokenError") {
        return sendError(res, "Invalid token", 401, "INVALID_TOKEN");
      }
      throw error;
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId },
      select: {
        user_id: true,
        phone_number: true,
        full_name: true,
        email: true,
        user_type: true,
        is_active: true,
        is_verified: true,
      },
    });

    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    if (!user.is_active) {
      return sendError(
        res,
        "Account has been deactivated",
        403,
        "ACCOUNT_DEACTIVATED",
      );
    }

    // Attach user to request
    req.user = user;
    req.userId = user.user_id;
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return sendError(res, "Authentication failed", 500, "AUTH_ERROR");
  }
};

/**
 * Verify user is a partner (driver/vehicle owner)
 */
const authenticatePartner = async (req, res, next) => {
  try {
    // First authenticate as user
    await authenticate(req, res, async () => {
      // Check if user is a partner
      const partner = await prisma.partner.findUnique({
        where: { userId: req.userId },
        select: {
          id: true,
          partnerType: true,
          verificationStatus: true,
          isOnline: true,
        },
      });

      if (!partner) {
        return sendError(
          res,
          "Partner profile not found",
          403,
          "NOT_A_PARTNER",
        );
      }

      if (partner.verificationStatus !== "approved") {
        return sendError(
          res,
          `Partner verification is ${partner.verificationStatus}`,
          403,
          "PARTNER_NOT_VERIFIED",
        );
      }

      // Attach partner to request
      req.partner = partner;
      req.partnerId = partner.id;

      next();
    });
  } catch (error) {
    console.error("Partner authentication error:", error);
    return sendError(
      res,
      "Partner authentication failed",
      500,
      "PARTNER_AUTH_ERROR",
    );
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work differently for authenticated vs non-authenticated users
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without user
      req.user = null;
      req.userId = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await prisma.user.findUnique({
        where: { user_id: decoded.userId },
        select: {
          user_id: true,
          phone_number: true,
          full_name: true,
          email: true,
          user_type: true,
          is_active: true,
        },
      });

      if (user && user.is_active) {
        req.user = user;
        req.userId = user.user_id;
      }
    } catch (error) {
      // Invalid token, but don't fail - just continue without user
      console.warn("Optional auth - invalid token:", error.message);
    }

    next();
  } catch (error) {
    console.error("Optional authentication error:", error);
    next(); // Continue anyway
  }
};

/**
 * Check if user has specific user type
 */
const requireUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return sendError(
        res,
        `This action requires user type: ${allowedTypes.join(" or ")}`,
        403,
        "FORBIDDEN",
      );
    }

    next();
  };
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(
        res,
        "Refresh token is required",
        400,
        "MISSING_REFRESH_TOKEN",
      );
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      req.tokenData = decoded;
      console.log(decoded);
      
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return sendError(
          res,
          "Refresh token has expired",
          401,
          "REFRESH_TOKEN_EXPIRED",
        );
      }
      if (error.name === "JsonWebTokenError") {
        return sendError(
          res,
          "Invalid refresh token",
          401,
          "INVALID_REFRESH_TOKEN",
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Refresh token verification error:", error);
    return sendError(
      res,
      "Token verification failed",
      500,
      "TOKEN_VERIFICATION_ERROR",
    );
  }
};

/**
 * Check if user owns the resource
 * Expects req.params.userId or req.params.id
 */
const isResourceOwner = (req, res, next) => {
  const resourceUserId = req.params.userId || req.params.id;

  if (!req.userId) {
    return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
  }

  if (req.userId.toString() !== resourceUserId.toString()) {
    return sendError(
      res,
      "Access denied - not resource owner",
      403,
      "FORBIDDEN",
    );
  }

  next();
};

module.exports = {
  authenticate,
  authenticatePartner,
  optionalAuthenticate,
  requireUserType,
  verifyRefreshToken,
  isResourceOwner,
};
