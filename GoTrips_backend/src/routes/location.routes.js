const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const addLocationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'District name must be at least 2 characters',
    'string.max': 'District name cannot exceed 100 characters',
    'string.empty': 'District name is required',
  }),
  points: Joi.array().items(Joi.string().min(2).max(100)).min(1).required().messages({
    'array.min': 'At least one major point is required',
    'array.base': 'Points must be an array',
  }),
});

const updateLocationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'District name must be at least 2 characters',
    'string.empty': 'District name is required',
  }),
  points: Joi.array().items(Joi.string().min(2).max(100)).min(1).required().messages({
    'array.min': 'At least one major point is required',
  }),
});

const addPointSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Point name must be at least 2 characters',
    'string.empty': 'Point name is required',
  }),
});

const searchQuerySchema = Joi.object({
  query: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Search query must be at least 2 characters',
  }),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const locationsQuerySchema = Joi.object({
  search: Joi.string().min(2).max(100).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Invalid ID format',
  }),
});

const pointParamsSchema = Joi.object({
  districtId: Joi.string().pattern(/^\d+$/).required(),
  pointId: Joi.string().pattern(/^\d+$/).required(),
});

// =====================================================
// PUBLIC ROUTES
// =====================================================

/**
 * @route   GET /api/locations
 * @desc    Get all districts and their major points
 * @access  Public
 */
router.get('/', validateQuery(locationsQuerySchema), locationController.getAllLocations);

/**
 * @route   GET /api/locations/search
 * @desc    Search locations (districts and points)
 * @access  Public
 */
router.get('/search', validateQuery(searchQuerySchema), locationController.searchLocations);

/**
 * @route   GET /api/locations/:id
 * @desc    Get single district with all points
 * @access  Public
 */
router.get('/:id', validateParams(idParamSchema), locationController.getLocationById);

// =====================================================
// ADMIN ROUTES
// =====================================================

/**
 * @route   POST /api/locations
 * @desc    Add a new district with major points
 * @access  Private (Admin)
 */
router.post(
  '/',
  //   authenticate,
  // Add admin check middleware here
  generalLimiter,
  validateBody(addLocationSchema),
  locationController.addLocation
);

/**
 * @route   PUT /api/locations/:id
 * @desc    Update a district and its major points
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  // Add admin check middleware here
  validateParams(idParamSchema),
  validateBody(updateLocationSchema),
  locationController.updateLocation
);

/**
 * @route   DELETE /api/locations/:id
 * @desc    Delete a district and all its major points
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  // Add admin check middleware here
  validateParams(idParamSchema),
  locationController.deleteLocation
);

/**
 * @route   POST /api/locations/:id/points
 * @desc    Add a major point to existing district
 * @access  Private (Admin)
 */
router.post(
  '/:id/points',
  authenticate,
  // Add admin check middleware here
  validateParams(idParamSchema),
  validateBody(addPointSchema),
  locationController.addMajorPoint
);

/**
 * @route   DELETE /api/locations/:districtId/points/:pointId
 * @desc    Delete a major point
 * @access  Private (Admin)
 */
router.delete(
  '/:districtId/points/:pointId',
  authenticate,
  // Add admin check middleware here
  validateParams(pointParamsSchema),
  locationController.deleteMajorPoint
);

module.exports = router;
