const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { uploadVehiclePhotosMiddleware } = require('../middleware/upload.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const addVehicleSchema = Joi.object({
  vehicleType: Joi.string().valid('taxi', 'bike', 'rental_car', 'commercial_vehicle').required(),
  vehicleCategory: Joi.string().valid('sedan', 'suv', 'hatchback', 'motorcycle', 'auto', 'mini_truck', 'van').required(),
  manufacturer: Joi.string().min(2).max(50).required(),
  model: Joi.string().min(2).max(50).required(),
  year: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  color: Joi.string().max(30).optional(),
  numberPlate: Joi.string().min(5).max(20).required().messages({
    'string.min': 'Number plate must be at least 5 characters',
    'string.max': 'Number plate cannot exceed 20 characters',
  }),
  seatingCapacity: Joi.number().integer().min(1).max(50).optional(),
  fuelType: Joi.string().valid('petrol', 'diesel', 'cng', 'electric', 'hybrid').optional(),
  acAvailable: Joi.boolean().optional(),
  rentalPricePerHour: Joi.number().min(0).optional(),
  rentalPricePerDay: Joi.number().min(0).optional(),
  ridePricePerKm: Joi.number().min(0).optional(),
  baseFare: Joi.number().min(0).optional(),
  features: Joi.array().items(Joi.string()).optional(),
});

const updateVehicleSchema = Joi.object({
  vehicleCategory: Joi.string().valid('sedan', 'suv', 'hatchback', 'motorcycle', 'auto', 'mini_truck', 'van').optional(),
  color: Joi.string().max(30).optional(),
  seatingCapacity: Joi.number().integer().min(1).max(50).optional(),
  acAvailable: Joi.boolean().optional(),
  rentalPricePerHour: Joi.number().min(0).optional(),
  rentalPricePerDay: Joi.number().min(0).optional(),
  ridePricePerKm: Joi.number().min(0).optional(),
  baseFare: Joi.number().min(0).optional(),
  features: Joi.array().items(Joi.string()).optional(),
}).min(1);

const vehicleQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  vehicleType: Joi.string().valid('taxi', 'bike', 'rental_car', 'commercial_vehicle').optional(),
  vehicleCategory: Joi.string().valid('sedan', 'suv', 'hatchback', 'motorcycle', 'auto', 'mini_truck', 'van').optional(),
  isAvailable: Joi.string().valid('true', 'false').optional(),
  isVerified: Joi.string().valid('true', 'false').optional(),
  fuelType: Joi.string().valid('petrol', 'diesel', 'cng', 'electric', 'hybrid').optional(),
  acAvailable: Joi.string().valid('true', 'false').optional(),
  minSeats: Joi.number().integer().min(1).optional(),
  maxPrice: Joi.number().min(0).optional(),
  partnerId: Joi.string().pattern(/^\d+$/).optional(),
  search: Joi.string().optional(),
  sortBy: Joi.string().valid('createdAt', 'ratingAverage', 'rentalPricePerDay', 'ridePricePerKm').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const myVehiclesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isAvailable: Joi.string().valid('true', 'false').optional(),
  isVerified: Joi.string().valid('true', 'false').optional(),
  sortBy: Joi.string().valid('createdAt', 'ratingAverage', 'totalTrips').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const reviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const availabilitySchema = Joi.object({
  isAvailable: Joi.boolean().optional(),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
});

const photoParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
  photoIndex: Joi.string().pattern(/^\d+$/).required(),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   POST /api/vehicles
 * @desc    Add new vehicle
 * @access  Private (Partner only)
 * @Test    Yes
 */
router.post('/', authenticate, validateBody(addVehicleSchema), vehicleController.addVehicle);

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles with filters
 * @access  Public
 * @Test    Yes
 */
router.get('/', optionalAuthenticate, validateQuery(vehicleQuerySchema), vehicleController.getAllVehicles);

/**
 * @route   GET /api/vehicles/my-vehicles
 * @desc    Get partner's vehicles
 * @access  Private (Partner)
 * @Test    Yes
 */
router.get('/my-vehicles', authenticate, validateQuery(myVehiclesQuerySchema), vehicleController.getMyVehicles);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Public
 * @Test    Yes  
 */
router.get('/:id', validateParams(idParamSchema), vehicleController.getVehicleById);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update vehicle
 * @access  Private (Partner - owner only)
 * @Test    Yes
 */
router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(updateVehicleSchema), vehicleController.updateVehicle);

/**
 * @route   POST /api/vehicles/:id/photos
 * @desc    Upload vehicle photos
 * @access  Private (Partner)
 */
router.post('/:id/photos', authenticate, validateParams(idParamSchema), uploadVehiclePhotosMiddleware, vehicleController.uploadVehiclePhotos);

/**
 * @route   DELETE /api/vehicles/:id/photos/:photoIndex
 * @desc    Delete vehicle photo
 * @access  Private (Partner)
 */
router.delete('/:id/photos/:photoIndex', authenticate, validateParams(photoParamSchema), vehicleController.deleteVehiclePhoto);

/**
 * @route   PUT /api/vehicles/:id/availability
 * @desc    Toggle vehicle availability
 * @access  Private (Partner)
 */
router.put('/:id/availability', authenticate, validateParams(idParamSchema), validateBody(availabilitySchema), vehicleController.toggleAvailability);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete vehicle (soft delete)
 * @access  Private (Partner)
 */
router.delete('/:id', authenticate, validateParams(idParamSchema), vehicleController.deleteVehicle);

/**
 * @route   GET /api/vehicles/:id/stats
 * @desc    Get vehicle statistics
 * @access  Private (Partner - owner only)
 */
router.get('/:id/stats', authenticate, validateParams(idParamSchema), vehicleController.getVehicleStats);

/**
 * @route   GET /api/vehicles/:id/reviews
 * @desc    Get vehicle reviews
 * @access  Public
 */
router.get('/:id/reviews', validateParams(idParamSchema), validateQuery(reviewsQuerySchema), vehicleController.getVehicleReviews);

module.exports = router;
