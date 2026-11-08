const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');
const { authenticate, authenticatePartner } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { uploadPartnerDocumentsMiddleware } = require('../middleware/upload.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const registerPartnerSchema = Joi.object({
  partnerType: Joi.string().valid('vehicle_service', 'vehicle_driver', 'vehicle_rental').required(),
  businessName: Joi.string().max(100).optional(),
  // bankAccountNumber: Joi.string().min(9).max(18).optional(),
  // bankIfscCode: Joi.string()
  //   .length(11)
  //   .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  //   .optional(),
  // bankAccountHolder: Joi.string().max(100).optional(),
  // upiId: Joi.string().max(100).optional(),
});

const updatePartnerSchema = Joi.object({
  businessName: Joi.string().max(100).optional(),
  // bankAccountNumber: Joi.string().min(9).max(18).optional(),
  // bankIfscCode: Joi.string()
  //   .length(11)
  //   .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  //   .optional(),
  // bankAccountHolder: Joi.string().max(100).optional(),
  // upiId: Joi.string().max(100).optional(),
  languagePreference: Joi.string().max(10).optional(),
}).min(1);

const onlineStatusSchema = Joi.object({
  isOnline: Joi.boolean().optional(),
});

const partnerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'ratingAverage', 'totalRidesCompleted').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  partnerType: Joi.string().valid('vehicle_service', 'vehicle_driver', 'vehicle_rental').optional(),
  verificationStatus: Joi.string().valid('pending', 'approved', 'rejected', 'suspended').optional(),
  isOnline: Joi.string().valid('true', 'false').optional(),
  search: Joi.string().optional(),
});

const earningsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  payoutStatus: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
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

const userIdParamSchema = Joi.object({
  userId: Joi.string().pattern(/^\d+$/).required(),
});

const payoutRequestSchema = Joi.object({
  amount: Joi.number().min(100).required().messages({
    'number.min': 'Minimum payout amount is ₹100',
  }),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   POST /api/partners/register
 * @desc    Register as partner (driver/vehicle owner)
 * @access  Private (authenticated user)
 * @Test    Yes
 */
router.post('/register', authenticate, validateBody(registerPartnerSchema), partnerController.registerPartner);

/**
 * @route   PUT /api/partners/:id/online-status
 * @desc    Toggle partner online/offline status
 * @access  Private
 * @Test    Yes
 */
router.put('/:id/status/update', authenticate, validateBody(onlineStatusSchema), partnerController.toggleOnlineStatus);


/**
 * @route   GET /api/partners/:id/stats
 * @desc    Get partner statistics
 * @access  Private
 * @Test    Yes
 */
router.get('/:id/stats', authenticate,  partnerController.getPartnerStats);

/**
 * @route   GET /api/partners/:id 
 * @desc    Get partner profile by ID
 * @access  Private (own profile or admin)
 * @Test    Yes
 */
router.get('/:id', authenticate, validateParams(idParamSchema), partnerController.getPartnerById);




/**
 * @route   GET /api/partners/user/:userId
 * @desc    Get partner profile by user ID
 * @access  Private
 * @Test    Yes
 */
router.get('/user/:userId', authenticate, validateParams(userIdParamSchema), partnerController.getPartnerByUserId);

/**
 * @route   GET /api/partners
 * @desc    Get all partners (Admin only)
 * @access  Private (Admin)
 */
  // Add admin check when implemented
router.get('/', authenticate, validateQuery(partnerQuerySchema), partnerController.getAllPartners);

/**
 * @route   PUT /api/partners/:id
 * @desc    Update partner profile
 * @access  Private (own profile)
 */
router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(updatePartnerSchema), partnerController.updatePartner);

/**
 * @route   POST /api/partners/:id/documents
 * @desc    Upload partner documents
 * @access  Private
 * @Test    Yes
 */
router.post('/:id/documents', authenticate, validateParams(idParamSchema), uploadPartnerDocumentsMiddleware, partnerController.uploadDocuments);

/**
 * @route   GET /api/partners/:id/documents
 * @desc    Get partner documents
 * @access  Private
 * @Test    Yes
 */
router.get('/:id/documents', authenticate, validateParams(idParamSchema), partnerController.getDocuments);


/**
 * @route   GET /api/partners/:id/earnings
 * @desc    Get partner earnings
 * @access  Private
 */
router.get('/:id/earnings', authenticate, validateParams(idParamSchema), validateQuery(earningsQuerySchema), partnerController.getEarnings);



/**
 * @route   GET /api/partners/:id/rides
 * @desc    Get partner's rides
 * @access  Private
 * @Test    Yes
 */
router.get('/:id/rides', authenticate, validateParams(idParamSchema), validateQuery(ridesQuerySchema), partnerController.getPartnerRides);

/**
 * @route   POST /api/partners/:id/payout-request
 * @desc    Request payout
 * @access  Private
 */
router.post('/:id/payout-request', authenticate, validateParams(idParamSchema), validateBody(payoutRequestSchema), partnerController.requestPayout);

module.exports = router;
