const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Submit review/rating
 * POST /api/reviews
 * @access Private
 */
exports.submitReview = catchAsync(async (req, res) => {
  const {
    reviewType,
    rideId,
    rentalBookingId,
    revieweeId,
    vehicleId,
    rating,
    reviewText,
    reviewTags,
  } = req.body;

  // Validation
  if (!reviewType || !rating) {
    return sendError(res, 'Review type and rating are required', 400, 'VALIDATION_ERROR');
  }

  if (rating < 1 || rating > 5) {
    return sendError(res, 'Rating must be between 1 and 5', 400, 'INVALID_RATING');
  }

  // Validate review type specific requirements
  if (reviewType === 'ride' && !rideId) {
    return sendError(res, 'Ride ID is required for ride review', 400, 'RIDE_ID_REQUIRED');
  }

  if (reviewType === 'rental' && !rentalBookingId) {
    return sendError(res, 'Booking ID is required for rental review', 400, 'BOOKING_ID_REQUIRED');
  }

  // Check if ride/booking exists and is completed
  if (reviewType === 'ride') {
    const ride = await prisma.ride.findUnique({
      where: { rideId: BigInt(rideId) },
    });

    if (!ride) {
      return sendNotFound(res, 'Ride');
    }

    if (ride.passengerId.toString() !== req.userId.toString()) {
      return sendError(res, 'Access denied', 403, 'FORBIDDEN');
    }

    if (ride.rideStatus !== 'completed') {
      return sendError(res, 'Can only review completed rides', 400, 'RIDE_NOT_COMPLETED');
    }

    // Check if already reviewed
    const existingReview = await prisma.ratingsReview.findFirst({
      where: {
        rideId: BigInt(rideId),
        reviewerId: req.userId,
      },
    });

    if (existingReview) {
      return sendError(res, 'You have already reviewed this ride', 409, 'ALREADY_REVIEWED');
    }
  }

  if (reviewType === 'rental') {
    const booking = await prisma.rentalBooking.findUnique({
      where: { bookingId: BigInt(rentalBookingId) },
    });

    if (!booking) {
      return sendNotFound(res, 'Booking');
    }

    if (booking.passengerId.toString() !== req.userId.toString()) {
      return sendError(res, 'Access denied', 403, 'FORBIDDEN');
    }

    if (booking.bookingStatus !== 'completed') {
      return sendError(res, 'Can only review completed bookings', 400, 'BOOKING_NOT_COMPLETED');
    }

    // Check if already reviewed
    const existingReview = await prisma.ratingsReview.findFirst({
      where: {
        rentalBookingId: BigInt(rentalBookingId),
        reviewerId: req.userId,
      },
    });

    if (existingReview) {
      return sendError(res, 'You have already reviewed this booking', 409, 'ALREADY_REVIEWED');
    }
  }

  // Create review
  const review = await prisma.ratingsReview.create({
    data: {
      reviewType,
      rideId: rideId ? BigInt(rideId) : null,
      rentalBookingId: rentalBookingId ? BigInt(rentalBookingId) : null,
      reviewerId: req.userId,
      revieweeId: revieweeId ? BigInt(revieweeId) : null,
      vehicleId: vehicleId ? BigInt(vehicleId) : null,
      rating: parseInt(rating),
      reviewText,
      reviewTags: reviewTags || null,
      isVisible: true,
    },
  });

  // Update average rating for reviewee (driver/partner)
  if (revieweeId) {
    const reviews = await prisma.ratingsReview.findMany({
      where: {
        revieweeId: BigInt(revieweeId),
        isVisible: true,
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      // Get partner from user
      const partner = await prisma.partner.findUnique({
        where: { userId: BigInt(revieweeId) },
      });

      if (partner) {
        await prisma.partner.update({
          where: { partnerId: partner.partnerId },
          data: {
            ratingAverage: parseFloat(avgRating.toFixed(2)),
          },
        });
      }
    }
  }

  // Update vehicle rating
  if (vehicleId) {
    const vehicleReviews = await prisma.ratingsReview.findMany({
      where: {
        vehicleId: BigInt(vehicleId),
        isVisible: true,
      },
      select: {
        rating: true,
      },
    });

    if (vehicleReviews.length > 0) {
      const avgRating = vehicleReviews.reduce((sum, r) => sum + r.rating, 0) / vehicleReviews.length;

      await prisma.vehicle.update({
        where: { vehicleId: BigInt(vehicleId) },
        data: {
          ratingAverage: parseFloat(avgRating.toFixed(2)),
        },
      });
    }
  }

  sendCreated(res, review, 'Review submitted successfully');
});

/**
 * Get reviews for a user/driver
 * GET /api/reviews/user/:userId
 * @access Public
 */
exports.getUserReviews = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const {
    page = 1,
    limit = 20,
    minRating,
    maxRating,
  } = req.query;

  const skip = (page - 1) * limit;
  const where = {
    revieweeId: BigInt(userId),
    isVisible: true,
  };

  if (minRating) {
    where.rating = { gte: parseInt(minRating) };
  }

  if (maxRating) {
    where.rating = { ...where.rating, lte: parseInt(maxRating) };
  }

  const [reviews, total, stats] = await Promise.all([
    prisma.ratingsReview.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            fullName: true,
            profilePhotoUrl: true,
          },
        },
      },
    }),
    prisma.ratingsReview.count({ where }),
    prisma.ratingsReview.groupBy({
      by: ['rating'],
      where: {
        revieweeId: BigInt(userId),
        isVisible: true,
      },
      _count: true,
    }),
  ]);

  // Calculate rating distribution
  const ratingDistribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  stats.forEach((stat) => {
    ratingDistribution[stat.rating] = stat._count;
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
    : 0;

  sendPaginated(
    res,
    {
      reviews,
      statistics: {
        averageRating: parseFloat(avgRating),
        totalReviews: total,
        ratingDistribution,
      },
    },
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  );
});

/**
 * Get reviews for a vehicle
 * GET /api/reviews/vehicle/:vehicleId
 * @access Public
 */
exports.getVehicleReviews = catchAsync(async (req, res) => {
  const { vehicleId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;
  const where = {
    vehicleId: BigInt(vehicleId),
    isVisible: true,
  };

  const [reviews, total] = await Promise.all([
    prisma.ratingsReview.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            fullName: true,
            profilePhotoUrl: true,
          },
        },
      },
    }),
    prisma.ratingsReview.count({ where }),
  ]);

  sendPaginated(res, reviews, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get my reviews (given by me)
 * GET /api/reviews/my-reviews
 * @access Private
 */
exports.getMyReviews = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, reviewType } = req.query;

  const skip = (page - 1) * limit;
  const where = { reviewerId: req.userId };

  if (reviewType) {
    where.reviewType = reviewType;
  }

  const [reviews, total] = await Promise.all([
    prisma.ratingsReview.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reviewee: {
          select: {
            fullName: true,
            profilePhotoUrl: true,
          },
        },
        vehicle: {
          select: {
            manufacturer: true,
            model: true,
            numberPlate: true,
          },
        },
      },
    }),
    prisma.ratingsReview.count({ where }),
  ]);

  sendPaginated(res, reviews, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get reviews received by me
 * GET /api/reviews/reviews-received
 * @access Private
 */
exports.getReviewsReceived = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;
  const where = { revieweeId: req.userId };

  const [reviews, total, stats] = await Promise.all([
    prisma.ratingsReview.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            fullName: true,
            profilePhotoUrl: true,
          },
        },
        ride: {
          select: {
            rideId: true,
            pickupAddress: true,
            dropAddress: true,
          },
        },
      },
    }),
    prisma.ratingsReview.count({ where }),
    prisma.ratingsReview.groupBy({
      by: ['rating'],
      where,
      _count: true,
    }),
  ]);

  // Calculate rating distribution
  const ratingDistribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  stats.forEach((stat) => {
    ratingDistribution[stat.rating] = stat._count;
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
    : 0;

  sendPaginated(
    res,
    {
      reviews,
      statistics: {
        averageRating: parseFloat(avgRating),
        totalReviews: total,
        ratingDistribution,
      },
    },
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  );
});

/**
 * Update review
 * PUT /api/reviews/:id
 * @access Private (Reviewer only)
 */
exports.updateReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { rating, reviewText, reviewTags } = req.body;

  const review = await prisma.ratingsReview.findUnique({
    where: { reviewId: BigInt(id) },
  });

  if (!review) {
    return sendNotFound(res, 'Review');
  }

  if (review.reviewerId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Can only update within 24 hours
  const hoursSinceCreation = (new Date() - new Date(review.createdAt)) / (1000 * 60 * 60);
  if (hoursSinceCreation > 24) {
    return sendError(res, 'Reviews can only be edited within 24 hours', 400, 'EDIT_EXPIRED');
  }

  const updated = await prisma.ratingsReview.update({
    where: { reviewId: BigInt(id) },
    data: {
      ...(rating && { rating: parseInt(rating) }),
      ...(reviewText !== undefined && { reviewText }),
      ...(reviewTags && { reviewTags }),
    },
  });

  sendSuccess(res, updated, 'Review updated successfully');
});

/**
 * Delete review
 * DELETE /api/reviews/:id
 * @access Private (Reviewer only)
 */
exports.deleteReview = catchAsync(async (req, res) => {
  const { id } = req.params;

  const review = await prisma.ratingsReview.findUnique({
    where: { reviewId: BigInt(id) },
  });

  if (!review) {
    return sendNotFound(res, 'Review');
  }

  if (review.reviewerId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  await prisma.ratingsReview.delete({
    where: { reviewId: BigInt(id) },
  });

  sendSuccess(res, null, 'Review deleted successfully');
});

/**
 * Respond to review (Driver/Partner)
 * POST /api/reviews/:id/respond
 * @access Private (Reviewee only)
 */
exports.respondToReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { responseText } = req.body;

  if (!responseText) {
    return sendError(res, 'Response text is required', 400, 'RESPONSE_REQUIRED');
  }

  const review = await prisma.ratingsReview.findUnique({
    where: { reviewId: BigInt(id) },
  });

  if (!review) {
    return sendNotFound(res, 'Review');
  }

  if (!review.revieweeId || review.revieweeId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const updated = await prisma.ratingsReview.update({
    where: { reviewId: BigInt(id) },
    data: {
      responseText,
      respondedAt: new Date(),
    },
  });

  sendSuccess(res, updated, 'Response added successfully');
});

/**
 * Report review (Flag as inappropriate)
 * POST /api/reviews/:id/report
 * @access Private
 */
exports.reportReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return sendError(res, 'Report reason is required', 400, 'REASON_REQUIRED');
  }

  const review = await prisma.ratingsReview.findUnique({
    where: { reviewId: BigInt(id) },
  });

  if (!review) {
    return sendNotFound(res, 'Review');
  }

  // TODO: Create review_reports table for tracking
  // For now, just hide the review
  await prisma.ratingsReview.update({
    where: { reviewId: BigInt(id) },
    data: {
      isVisible: false,
    },
  });

  sendSuccess(res, null, 'Review reported and hidden. Admin will review it.');
});

/**
 * Get review statistics
 * GET /api/reviews/stats
 * @access Private
 */
exports.getReviewStats = catchAsync(async (req, res) => {
  const userId = req.userId;

  const [reviewsGiven, reviewsReceived] = await Promise.all([
    prisma.ratingsReview.count({
      where: { reviewerId: userId },
    }),
    prisma.ratingsReview.count({
      where: { revieweeId: userId },
    }),
  ]);

  // Get average rating received
  const receivedReviews = await prisma.ratingsReview.findMany({
    where: {
      revieweeId: userId,
      isVisible: true,
    },
    select: {
      rating: true,
    },
  });

  const avgRating = receivedReviews.length > 0
    ? (receivedReviews.reduce((sum, r) => sum + r.rating, 0) / receivedReviews.length).toFixed(2)
    : 0;

  sendSuccess(res, {
    reviewsGiven,
    reviewsReceived,
    averageRating: parseFloat(avgRating),
  });
});

module.exports = {
  submitReview,
  getUserReviews,
  getVehicleReviews,
  getMyReviews,
  getReviewsReceived,
  updateReview,
  deleteReview,
  respondToReview,
  reportReview,
  getReviewStats,
};