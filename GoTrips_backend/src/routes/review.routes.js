const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const submitReviewSchema = Joi.object({
  reviewType: Joi.string().valid('ride', 'rental', 'driver', 'vehicle').required(),
  rideId: Joi.string().pattern(/^\d+$/).when('reviewType', {
    is: 'ride',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  rentalBookingId: Joi.string().pattern(/^\d+$/).when('reviewType', {
    is: 'rental',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  revieweeId: Joi.string().pattern(/^\d+$/).optional(),
  vehicleId: Joi.string().pattern(/^\d+$/).optional(),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  reviewText: Joi.string().min(10).max(1000).optional().messages({
    'string.min': 'Review text must be at least 10 characters',
  }),
  reviewTags: Joi.array().items(Joi.string()).max(5).optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  reviewText: Joi.string().min(10).max(1000).optional(),
  reviewTags: Joi.array().items(Joi.string()).max(5).optional(),
}).min(1);

const respondToReviewSchema = Joi.object({
  responseText: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Response must be at least 10 characters',
  }),
});

const reportReviewSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Reason must be at least 10 characters',
  }),
});

const reviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  minRating: Joi.number().integer().min(1).max(5).optional(),
  maxRating: Joi.number().integer().min(1).max(5).optional(),
  reviewType: Joi.string().valid('ride', 'rental', 'driver', 'vehicle').optional(),
});

const userIdParamSchema = Joi.object({
  userId: Joi.string().pattern(/^\d+$/).required(),
});

const vehicleIdParamSchema = Joi.object({
  vehicleId: Joi.string().pattern(/^\d+$/).required(),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   POST /api/reviews
 * @desc    Submit a review/rating
 * @access  Private
 */
router.post('/', authenticate, generalLimiter, validateBody(submitReviewSchema), reviewController.submitReview);

/**
 * @route   GET /api/reviews/my-reviews
 * @desc    Get reviews given by me
 * @access  Private
 */
router.get('/my-reviews', authenticate, validateQuery(reviewsQuerySchema), reviewController.getMyReviews);

/**
 * @route   GET /api/reviews/reviews-received
 * @desc    Get reviews received by me
 * @access  Private
 */
router.get('/reviews-received', authenticate, validateQuery(reviewsQuerySchema), reviewController.getReviewsReceived);

/**
 * @route   GET /api/reviews/stats
 * @desc    Get review statistics
 * @access  Private
 */
router.get('/stats', authenticate, reviewController.getReviewStats);

/**
 * @route   GET /api/reviews/user/:userId
 * @desc    Get reviews for a specific user/driver
 * @access  Public
 */
router.get('/user/:userId', optionalAuthenticate, validateParams(userIdParamSchema), validateQuery(reviewsQuerySchema), reviewController.getUserReviews);

/**
 * @route   GET /api/reviews/vehicle/:vehicleId
 * @desc    Get reviews for a specific vehicle
 * @access  Public
 */
router.get('/vehicle/:vehicleId', optionalAuthenticate, validateParams(vehicleIdParamSchema), validateQuery(reviewsQuerySchema), reviewController.getVehicleReviews);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update review (within 24 hours)
 * @access  Private (Reviewer only)
 */
router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(updateReviewSchema), reviewController.updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Private (Reviewer only)
 */
router.delete('/:id', authenticate, validateParams(idParamSchema), reviewController.deleteReview);

/**
 * @route   POST /api/reviews/:id/respond
 * @desc    Respond to a review (Driver/Partner)
 * @access  Private (Reviewee only)
 */
router.post('/:id/respond', authenticate, validateParams(idParamSchema), validateBody(respondToReviewSchema), reviewController.respondToReview);

/**
 * @route   POST /api/reviews/:id/report
 * @desc    Report inappropriate review
 * @access  Private
 */
router.post('/:id/report', authenticate, validateParams(idParamSchema), validateBody(reportReviewSchema), reviewController.reportReview);

module.exports = router;
