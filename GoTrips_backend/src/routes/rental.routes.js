const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rental.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { generalLimiter, searchLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const searchVehiclesSchema = Joi.object({
  vehicleType: Joi.string().valid('rental_car', 'commercial_vehicle').default('rental_car'),
  vehicleCategory: Joi.string().valid('sedan', 'suv', 'hatchback', 'mini_truck', 'van').optional(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .default('00:00'),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .default('23:59'),
  location: Joi.string().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  seatingCapacity: Joi.number().integer().min(1).max(20).optional(),
  fuelType: Joi.string().valid('petrol', 'diesel', 'cng', 'electric', 'hybrid').optional(),
  acAvailable: Joi.string().valid('true', 'false').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('rentalPricePerDay', 'rentalPricePerHour', 'ratingAverage', 'seatingCapacity').default('rentalPricePerDay'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

const createBookingSchema = Joi.object({
  vehicleId: Joi.string().pattern(/^\d+$/).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .default('00:00'),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .default('23:59'),
  pickupLocation: Joi.string().min(10).required(),
  returnLocation: Joi.string().min(10).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled').required(),
  cancellationReason: Joi.string().when('status', {
    is: 'cancelled',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const cancelBookingSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Cancellation reason must be at least 10 characters',
    'string.max': 'Cancellation reason cannot exceed 500 characters',
  }),
});

const bookingQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled').optional(),
  sortBy: Joi.string().valid('createdAt', 'startDate', 'totalAmount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   GET /api/rentals/search
 * @desc    Search available vehicles for rent
 * @access  Public
 */
router.get('/search', searchLimiter, validateQuery(searchVehiclesSchema), rentalController.searchVehicles);

/**
 * @route   POST /api/rentals
 * @desc    Create rental booking
 * @access  Private
 */
router.post('/', authenticate, validateBody(createBookingSchema), rentalController.createBooking);

/**
 * @route   GET /api/rentals/my-bookings
 * @desc    Get user's rental bookings
 * @access  Private
 */
router.get('/my-bookings', authenticate, validateQuery(bookingQuerySchema), rentalController.getMyBookings);

/**
 * @route   GET /api/rentals/owner-bookings
 * @desc    Get owner's rental bookings
 * @access  Private (Partner/Owner)
 */
router.get('/owner-bookings', authenticate, validateQuery(bookingQuerySchema), rentalController.getOwnerBookings);

/**
 * @route   GET /api/rentals/stats
 * @desc    Get user's rental statistics
 * @access  Private
 */
router.get('/stats', authenticate, rentalController.getRentalStats);

/**
 * @route   GET /api/rentals/:id
 * @desc    Get booking by ID
 * @access  Private (Passenger or Owner)
 */
router.get('/:id', authenticate, validateParams(idParamSchema), rentalController.getBookingById);

/**
 * @route   PUT /api/rentals/:id/status
 * @desc    Update booking status (Owner/Partner)
 * @access  Private (Owner)
 */
router.put('/:id/status', authenticate, validateParams(idParamSchema), validateBody(updateStatusSchema), rentalController.updateBookingStatus);

/**
 * @route   POST /api/rentals/:id/cancel
 * @desc    Cancel booking (Passenger)
 * @access  Private
 */
router.post('/:id/cancel', authenticate, validateParams(idParamSchema), validateBody(cancelBookingSchema), rentalController.cancelBooking);

module.exports = router;
