const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate, verifyRefreshToken, } = require("../middleware/auth.middleware");
const { validateBody, schemas, } = require("../middleware/validation.middleware");
const { uploadProfilePhotoMiddleware, } = require("../middleware/upload.middleware");
const { authLimiter, otpLimiter, } = require("../middleware/rateLimit.middleware");
const Joi = require("joi");

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const sendOTPSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required().messages({ "string.pattern.base": "Phone number must be 10 digits", }),
  countryCode: Joi.string().default("+91"),
  otpType: Joi.string().valid("login", "signup").default("login"),
});

const verifyOTPSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
    "string.pattern.base": "Phone number must be 10 digits",
  }),
  countryCode: Joi.string().default("+91"),
  otp: Joi.string().length(6).pattern(/^[0-9]{6}$/).required().messages({
    "string.length": "OTP must be 6 digits", "string.pattern.base": "OTP must contain only numbers",
  }),
  deviceToken: Joi.string().optional(),
  deviceType: Joi.string().valid("android", "ios").optional(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  dateOfBirth: Joi.date().max("now").optional(),
  gender: Joi.string().valid("male", "female", "other").optional(),
}).min(1); // At least one field required

const logoutSchema = Joi.object({
  deviceToken: Joi.string().optional(),
});

const checkPhoneSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
  countryCode: Joi.string().default("+91"),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP for login/signup
 * @access  Public
 * @Tested  Yes
 */
router.post("/send-otp",otpLimiter,validateBody(sendOTPSchema),authController.sendOTP,);


/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login/signup
 * @access  Public
 * @Tested  Yes
 */
router.post("/verify-otp",authLimiter,validateBody(verifyOTPSchema),authController.verifyOTP,);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 * @Tested  Yes
 */
router.post("/resend-otp",otpLimiter,validateBody(sendOTPSchema),authController.resendOTP,);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token)
 * @Tested  Yes
 */
router.post("/refresh-token",validateBody(refreshTokenSchema),verifyRefreshToken,authController.refreshToken,);

/**
 * @route   POST /api/auth/check-phone
 * @desc    Check if phone number exists
 * @access  Public
 */
router.post("/check-phone",validateBody(checkPhoneSchema),authController.checkPhone,);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", authenticate, authController.getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile",authenticate,validateBody(updateProfileSchema),authController.updateProfile,);

/**
 * @route   POST /api/auth/profile-photo
 * @desc    Update profile photo
 * @access  Private
 */
router.post("/profile-photo",authenticate,uploadProfilePhotoMiddleware,authController.updateProfilePhoto,);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout",authenticate,validateBody(logoutSchema),authController.logout,);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete("/account", authenticate, authController.deleteAccount);

module.exports = router;
