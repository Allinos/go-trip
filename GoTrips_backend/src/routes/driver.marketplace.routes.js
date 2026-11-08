const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/driver.marketplace.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { generalLimiter, searchLimiter, paymentLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const registerDriverSchema = Joi.object({
  serviceCity: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Service city is required',
    'string.min': 'Service city must be at least 2 characters',
  }),
  homeLocationLat: Joi.number().min(-90).max(90).optional(),
  homeLocationLng: Joi.number().min(-180).max(180).optional(),
  marketplaceBio: Joi.string().min(50).max(1000).required().messages({
    'string.min': 'Bio must be at least 50 characters',
    'string.max': 'Bio cannot exceed 1000 characters',
  }),
  specializations: Joi.array().items(Joi.string()).min(1).max(10).optional().messages({
    'array.min': 'Add at least 1 specialization',
  }),
  languagesSpoken: Joi.array().items(Joi.string()).min(1).max(10).optional().messages({
    'array.min': 'Add at least 1 language',
  }),
  yearsOfExperience: Joi.number().integer().min(0).max(50).optional(),
  primaryVehicleType: Joi.string().valid('taxi', 'bike', 'rental_car', 'commercial_vehicle').optional(),
  ownVehicle: Joi.boolean().optional(),
  expectedSalaryMin: Joi.number().min(0).optional(),
  expectedSalaryMax: Joi.number().min(0).optional(),
  preferredJobType: Joi.array()
    .items(Joi.string().valid('full_time', 'part_time', 'contract'))
    .optional(),
});

const verifyRegistrationSchema = Joi.object({
  orderId: Joi.string().required(),
  paymentId: Joi.string().required(),
  signature: Joi.string().required(),

  // Profile data
  serviceCity: Joi.string().min(2).max(100).required(),
  homeLocationLat: Joi.number().min(-90).max(90).optional(),
  homeLocationLng: Joi.number().min(-180).max(180).optional(),
  marketplaceBio: Joi.string().min(50).max(1000).required(),
  specializations: Joi.array().items(Joi.string()).optional(),
  languagesSpoken: Joi.array().items(Joi.string()).optional(),
  yearsOfExperience: Joi.number().integer().min(0).max(50).optional(),
  primaryVehicleType: Joi.string().optional(),
  ownVehicle: Joi.boolean().optional(),
  expectedSalaryMin: Joi.number().min(0).optional(),
  expectedSalaryMax: Joi.number().min(0).optional(),
  preferredJobType: Joi.array().items(Joi.string()).optional(),
});

const searchDriversSchema = Joi.object({
  // Location (one required)
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  city: Joi.string().optional(),
  radiusKm: Joi.number().integer().min(1).max(500).default(50),

  // Filters
  vehicleType: Joi.string().valid('taxi', 'bike', 'rental_car', 'commercial_vehicle').optional(),
  minExperience: Joi.number().integer().min(0).max(50).default(0),
  languages: Joi.string().optional(), // Single language filter
  specialization: Joi.string().optional(), // Single specialization filter

  // Pagination & Sorting
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sortBy: Joi.string().valid('distance', 'experience', 'completeness', 'rating').default('distance'),
}).custom((value, helpers) => {
  // Require either coordinates or city
  if (!value.latitude && !value.longitude && !value.city) {
    return helpers.error('any.custom', {
      message: 'Either coordinates (latitude, longitude) or city is required',
    });
  }

  // If one coordinate is provided, both must be provided
  if ((value.latitude && !value.longitude) || (!value.latitude && value.longitude)) {
    return helpers.error('any.custom', {
      message: 'Both latitude and longitude are required for location-based search',
    });
  }

  return value;
});

const verifyUnlockSchema = Joi.object({
  orderId: Joi.string().required().messages({
    'string.empty': 'Order ID is required',
  }),
  paymentId: Joi.string().required().messages({
    'string.empty': 'Payment ID is required',
  }),
  signature: Joi.string().required().messages({
    'string.empty': 'Payment signature is required',
  }),
});

const updateProfileSchema = Joi.object({
  marketplaceBio: Joi.string().min(50).max(1000).optional(),
  specializations: Joi.array().items(Joi.string()).min(1).max(10).optional(),
  languagesSpoken: Joi.array().items(Joi.string()).min(1).max(10).optional(),
  yearsOfExperience: Joi.number().integer().min(0).max(50).optional(),
  expectedSalaryMin: Joi.number().min(0).optional(),
  expectedSalaryMax: Joi.number().min(0).optional(),
  preferredJobType: Joi.array()
    .items(Joi.string().valid('full_time', 'part_time', 'contract'))
    .optional(),
  showInMarketplace: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

const updateLeadStatusSchema = Joi.object({
  leadStatus: Joi.string().valid('new', 'contacted', 'hired', 'not_interested', 'rejected').optional(),
  hiringStatus: Joi.string()
    .valid('interview_scheduled', 'hired_full_time', 'hired_part_time', 'hired_contract', 'rejected_by_user', 'rejected_by_driver', 'negotiating')
    .optional(),
  notes: Joi.string().max(1000).optional(),
}).min(1);

const leadsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  leadStatus: Joi.string().valid('new', 'contacted', 'hired', 'not_interested', 'expired', 'rejected').optional(),
});

const idParamSchema = Joi.object({
  partnerId: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Invalid partner ID',
  }),
});

const unlockIdParamSchema = Joi.object({
  unlockId: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Invalid unlock ID',
  }),
});

// =====================================================
// DRIVER ROUTES (Partner)
// =====================================================

/**
 * @route   POST /api/marketplace/register-driver
 * @desc    Register driver in marketplace (Initiate ₹49 payment)
 * @access  Private (Partner)
 */
router.post('/register-driver', authenticate, generalLimiter, validateBody(registerDriverSchema), marketplaceController.registerDriver);

/**
 * @route   POST /api/marketplace/verify-registration
 * @desc    Verify payment and activate marketplace profile
 * @access  Private (Partner)
 */
router.post('/verify-registration', authenticate, paymentLimiter, validateBody(verifyRegistrationSchema), marketplaceController.verifyRegistration);

/**
 * @route   GET /api/marketplace/my-profile
 * @desc    Get my marketplace profile
 * @access  Private (Partner)
 */
router.get('/my-profile', authenticate, marketplaceController.getMyProfile);

/**
 * @route   PUT /api/marketplace/my-profile
 * @desc    Update marketplace profile
 * @access  Private (Partner)
 */
router.put('/my-profile', authenticate, validateBody(updateProfileSchema), marketplaceController.updateMyProfile);

/**
 * @route   GET /api/marketplace/my-leads
 * @desc    Get leads who unlocked my contact
 * @access  Private (Partner)
 */
router.get('/my-leads', authenticate, validateQuery(leadsQuerySchema), marketplaceController.getMyLeads);

// =====================================================
// USER ROUTES (Employers/Customers)
// =====================================================

/**
 * @route   GET /api/marketplace/search-drivers
 * @desc    Search available drivers
 * @access  Public (Optional auth for showing unlocked status)
 */
router.get('/search-drivers', optionalAuthenticate, searchLimiter, validateQuery(searchDriversSchema), marketplaceController.searchDrivers);

/**
 * @route   POST /api/marketplace/unlock-driver/:partnerId
 * @desc    Initiate unlock payment (User pays ₹49)
 * @access  Private
 */
router.post('/unlock-driver/:partnerId', authenticate, generalLimiter, validateParams(idParamSchema), marketplaceController.initiateUnlock);

/**
 * @route   POST /api/marketplace/verify-unlock/:partnerId
 * @desc    Verify payment and reveal driver contact
 * @access  Private
 */
router.post('/verify-unlock/:partnerId', authenticate, paymentLimiter, validateParams(idParamSchema), validateBody(verifyUnlockSchema), marketplaceController.verifyUnlock);

/**
 * @route   GET /api/marketplace/my-unlocked-drivers
 * @desc    Get drivers I unlocked
 * @access  Private
 */
router.get('/my-unlocked-drivers', authenticate, validateQuery(leadsQuerySchema), marketplaceController.getMyUnlockedDrivers);

/**
 * @route   PUT /api/marketplace/my-unlocked-drivers/:unlockId
 * @desc    Update lead status and notes
 * @access  Private
 */
router.put('/my-unlocked-drivers/:unlockId', authenticate, validateParams(unlockIdParamSchema), validateBody(updateLeadStatusSchema), marketplaceController.updateLeadStatus);

// =====================================================
// COMMON ROUTES
// =====================================================

/**
 * @route   GET /api/marketplace/stats
 * @desc    Get marketplace statistics (Driver or User)
 * @access  Private
 */
router.get('/stats', authenticate, marketplaceController.getMarketplaceStats);

module.exports = router;
