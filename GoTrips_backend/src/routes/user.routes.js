const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, requireUserType } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams, schemas } = require('../middleware/validation.middleware');
const { uploadProfilePhotoMiddleware } = require('../middleware/upload.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const updateUserSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  dateOfBirth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
}).min(1); // At least one field required

const savedLocationSchema = Joi.object({
  locationType: Joi.string().valid('home', 'work', 'other').required(),
  locationName: Joi.string().max(100).optional(),
  address: Joi.string().min(10).required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  landmark: Joi.string().max(255).optional(),
});

const updateLocationSchema = Joi.object({
  locationName: Joi.string().max(100).optional(),
  address: Joi.string().min(10).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  landmark: Joi.string().max(255).optional(),
}).min(1);

const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'fullName', 'lastLogin').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().optional(),
  userType: Joi.string().valid('passenger', 'driver', 'both').optional(),
  isActive: Joi.string().valid('true', 'false').optional(),
  isVerified: Joi.string().valid('true', 'false').optional(),
});

const ridesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'accepted', 'started', 'completed', 'cancelled', 'no_show').optional(),
  sortBy: Joi.string().valid('createdAt', 'totalFare').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
});

const locationIdParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
  locationId: Joi.string().pattern(/^\d+$/).required(),
});

const userTypeSchema = Joi.object({
  userType: Joi.string().valid('passenger', 'driver', 'both').required(),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   GET /users/:id
 * @desc    Get user profile by ID
 * @access  Private (own profile or admin)
 * @Tested  yes
 */
router.get('/:id', authenticate, validateParams(idParamSchema), userController.getUserById);

/**
 * @route   GET /users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate, // requireUserType('admin'), // Uncomment when admin role is implemented
  validateQuery(userQuerySchema),
  userController.getAllUsers
);

/**
 * @route   PUT /users/:id
 * @desc    Update user profile
 * @access  Private (own profile only)
 * @Tested  yes
 */
router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(updateUserSchema), userController.updateUser);

/**
 * @route   POST /users/:id/profile-photo
 * @desc    Update profile photo
 * @access  Private (own profile only)
 * @Tested  yes
 */
router.post('/:id/profile-photo', authenticate, validateParams(idParamSchema), uploadProfilePhotoMiddleware, userController.updateProfilePhoto);

/**
 * @route   DELETE /users/:id
 * @desc    Delete/Deactivate user account
 * @access  Private (own account only)
 * @Tested  yes
 */
router.delete('/:id', authenticate, validateParams(idParamSchema), userController.deleteUser);

/**
 * @route   GET /users/:id/saved-locations
 * @desc    Get user's saved locations
 * @access  Private
 */
router.get('/:id/saved-locations', authenticate, validateParams(idParamSchema), userController.getSavedLocations);

/**
 * @route   POST /users/:id/saved-locations
 * @desc    Add saved location
 * @access  Private
 */
router.post('/:id/saved-locations', authenticate, validateParams(idParamSchema), validateBody(savedLocationSchema), userController.addSavedLocation);

/**
 * @route   PUT /users/:id/saved-locations/:locationId
 * @desc    Update saved location
 * @access  Private
 */
router.put('/:id/saved-locations/:locationId', authenticate, validateParams(locationIdParamSchema), validateBody(updateLocationSchema), userController.updateSavedLocation);

/**
 * @route   DELETE /users/:id/saved-locations/:locationId
 * @desc    Delete saved location
 * @access  Private
 */
router.delete('/:id/saved-locations/:locationId', authenticate, validateParams(locationIdParamSchema), userController.deleteSavedLocation);

/**
 * @route   GET /users/:id/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/:id/stats', authenticate, validateParams(idParamSchema), userController.getUserStats);

/**
 * @route   GET /users/:id/rides
 * @desc    Get user's ride history
 * @access  Private
 */
router.get('/:id/rides', authenticate, validateParams(idParamSchema), validateQuery(ridesQuerySchema), userController.getUserRides);

/**
 * @route   PUT /users/:id/user-type
 * @desc    Change user type (passenger/driver/both)
 * @access  Private
 */
router.put('/:id/user-type', authenticate, validateParams(idParamSchema), validateBody(userTypeSchema), userController.changeUserType);


/**
 * @route   PUT /users/:id/profile-onboarding
 * @desc    Complete user profile onboarding
 * @access  Private
 */
router.put('/:id/profile-onboarding', authenticate, validateParams(idParamSchema), userController.completeProfileOnboarding);





module.exports = router;
