const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const createRideSchema = Joi.object({
  rideType: Joi.string().valid('fixed_route', 'open_ride').required(),
  vehicleId: Joi.string().pattern(/^\d+$/).required(),

  // Pickup (required for all)
  // pickupLocationLat: Joi.number().min(-90).max(90).required(),
  // pickupLocationLng: Joi.number().min(-180).max(180).required(),
  pickupAddress: Joi.string().max(255).required(),

  // Drop (required for fixed_route, optional for open_ride)
  // dropLocationLat: Joi.number().min(-90).max(90).when('rideType', {
  //   is: 'fixed_route',
  //   then: Joi.required(),
  //   otherwise: Joi.optional(),
  // }),
  // dropLocationLng: Joi.number().min(-180).max(180).when('rideType', {
  //   is: 'fixed_route',
  //   then: Joi.required(),
  //   otherwise: Joi.optional(),
  // }),
  dropAddress: Joi.string().max(255).when('rideType', {
    is: 'fixed_route',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Capacity
  totalSeats: Joi.number().integer().min(1).max(50).optional(),
  totalCapacityKg: Joi.number().min(1).max(10000).optional(),

  // Pricing (based on ride type)
  fareAmount: Joi.number().min(0).optional(),
  pricePerSeat: Joi.number().min(0).optional(),
  pricePerKm: Joi.number().min(0).when('rideType', {
    is: 'open_ride',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  baseFare: Joi.number().min(0).when('rideType', {
    is: 'open_ride',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),

  // Schedule
  scheduledDepartureTime: Joi.date().iso().min('now').optional(),

  // Preferences
  rideCategory: Joi.string().valid('economy', 'premium', 'commercial').optional(),
  allowPets: Joi.boolean().optional(),
  allowSmoking: Joi.boolean().optional(),
  allowLuggage: Joi.boolean().optional(),
  maxLuggageKg: Joi.number().min(0).max(100).optional(),
  rideNotes: Joi.string().min(0).max(1000).optional(),
});

const updateRideSchema = Joi.object({
  // pickupLocationLat: Joi.number().min(-90).max(90).optional(),
  // pickupLocationLng: Joi.number().min(-180).max(180).optional(),
  pickupAddress: Joi.string().max(255).optional(),
  // dropLocationLat: Joi.number().min(-90).max(90).optional(),
  // dropLocationLng: Joi.number().min(-180).max(180).optional(),
  dropAddress: Joi.string().max(255).optional(),
  fareAmount: Joi.number().min(0).optional(),
  pricePerSeat: Joi.number().min(0).optional(),
  scheduledDepartureTime: Joi.date().iso().optional(),
  allowPets: Joi.boolean().optional(),
  allowSmoking: Joi.boolean().optional(),
  allowLuggage: Joi.boolean().optional(),
  maxLuggageKg: Joi.number().min(0).max(100).optional(),
  rideNotes: Joi.string().max(1000).optional(),
}).min(1);

const bookRideSchema = Joi.object({
  seatsBooked: Joi.number().integer().min(1).max(10).optional(),
  capacityBookedKg: Joi.number().min(1).max(1000).optional(),

  // For open_ride type
  pickupLocationLat: Joi.number().min(-90).max(90).optional(),
  pickupLocationLng: Joi.number().min(-180).max(180).optional(),
  pickupAddress: Joi.string().max(255).optional(),
  dropLocationLat: Joi.number().min(-90).max(90).optional(),
  dropLocationLng: Joi.number().min(-180).max(180).optional(),
  dropAddress: Joi.string().max(255).optional(),

  specialRequests: Joi.string().max(500).optional(),
});

const searchRidesSchema = Joi.object({
  rideType: Joi.string().valid('fixed_route', 'open_ride').optional(),
  pickupLat: Joi.number().min(-90).max(90).optional(),
  pickupLng: Joi.number().min(-180).max(180).optional(),
  dropLat: Joi.number().min(-90).max(90).optional(),
  dropLng: Joi.number().min(-180).max(180).optional(),
  seats: Joi.number().integer().min(1).max(10).optional(),
  departureDate: Joi.date().iso().optional(),
  maxFare: Joi.number().min(0).optional(),
  vehicleType: Joi.string().valid('taxi', 'bike', 'auto', 'rental_car', 'commercial').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const myRidesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  rideStatus: Joi.string().valid('pending', 'scheduled', 'accepted', 'started', 'completed', 'cancelled', 'expired').optional(),
  rideType: Joi.string().valid('fixed_route', 'open_ride').optional(),
});

const myBookingsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  bookingStatus: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed', 'no_show').optional(),
});

const cancelSchema = Joi.object({
  cancellationReason: Joi.string().min(3).max(500),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
});

// =====================================================
// PARTNER ROUTES (Create & Manage Rides)
// =====================================================

/**
 * @route   POST /api/rides/create
 * @desc    Create a new ride (PARTNER ONLY)
 * @access  Private (Partner)
 */
router.post('/create', authenticate, generalLimiter, validateBody(createRideSchema), rideController.createRide);

/**
 * @route   GET /api/rides/my-rides
 * @desc    Get rides created by partner
 * @access  Private (Partner)
 */
router.get('/my-rides', authenticate, validateQuery(myRidesQuerySchema), rideController.getMyCreatedRides);

/**
 * @route   PUT /api/rides/:id
 * @desc    Update ride details
 * @access  Private (Partner - Creator only)
 */
router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(updateRideSchema), rideController.updateRide);

/**
 * @route   POST /api/rides/:id/cancel
 * @desc    Cancel a ride
 * @access  Private (Partner - Creator only)
 */
router.post('/:id/cancel', authenticate, validateParams(idParamSchema), validateBody(cancelSchema), rideController.cancelRide);

// =====================================================
// USER ROUTES (Search & Book Rides)
// =====================================================

/**
 * @route   GET /api/rides/search
 * @desc    Search available rides
 * @access  Public
 */
router.get('/search', optionalAuthenticate, validateQuery(searchRidesSchema), rideController.searchRides);

/**
 * @route   GET /api/rides/:id
 * @desc    Get ride details
 * @access  Public
 */
router.get('/:id', optionalAuthenticate, validateParams(idParamSchema), rideController.getRideById);

/**
 * @route   POST /api/rides/:id/book
 * @desc    Book a ride
 * @access  Private (User)
 */
router.post('/:id/book', authenticate, validateParams(idParamSchema), validateBody(bookRideSchema), rideController.bookRide);

/**
 * @route   GET /api/rides/my-bookings
 * @desc    Get my ride bookings
 * @access  Private (User)
 */
router.get('/my-bookings', authenticate, validateQuery(myBookingsQuerySchema), rideController.getMyBookings);

/**
 * @route   POST /api/rides/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private (User)
 */
router.post('/bookings/:id/cancel', authenticate, validateParams(idParamSchema), validateBody(cancelSchema), rideController.cancelBooking);

module.exports = router;
