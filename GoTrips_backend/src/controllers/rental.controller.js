const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Search available vehicles for rent
 * GET /api/rentals/search
 * @access Public
 */
exports.searchVehicles = catchAsync(async (req, res) => {
  const {
    vehicleType,
    vehicleCategory,
    startDate,
    endDate,
    startTime = '00:00',
    endTime = '23:59',
    location,
    minPrice,
    maxPrice,
    seatingCapacity,
    fuelType,
    acAvailable,
    page = 1,
    limit = 20,
    sortBy = 'rentalPricePerDay',
    sortOrder = 'asc',
  } = req.query;

  // Validation
  if (!startDate || !endDate) {
    return sendError(res, 'Start date and end date are required', 400, 'DATES_REQUIRED');
  }

  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  if (start >= end) {
    return sendError(res, 'End date must be after start date', 400, 'INVALID_DATE_RANGE');
  }

  if (start < new Date()) {
    return sendError(res, 'Start date cannot be in the past', 400, 'PAST_DATE');
  }

  // Build where clause
  const where = {
    isAvailable: true,
    isVerified: true,
    vehicleType: vehicleType || 'rental_car',
  };

  if (vehicleCategory) {
    where.vehicleCategory = vehicleCategory;
  }

  if (seatingCapacity) {
    where.seatingCapacity = { gte: parseInt(seatingCapacity) };
  }

  if (fuelType) {
    where.fuelType = fuelType;
  }

  if (acAvailable !== undefined) {
    where.acAvailable = acAvailable === 'true';
  }

  if (minPrice || maxPrice) {
    where.rentalPricePerDay = {};
    if (minPrice) where.rentalPricePerDay.gte = parseFloat(minPrice);
    if (maxPrice) where.rentalPricePerDay.lte = parseFloat(maxPrice);
  }

  const skip = (page - 1) * limit;

  // Find available vehicles (not booked during requested period)
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        ...where,
        // Exclude vehicles with conflicting bookings
        NOT: {
          rentalBookings: {
            some: {
              AND: [
                {
                  OR: [{ bookingStatus: 'confirmed' }, { bookingStatus: 'active' }],
                },
                {
                  OR: [
                    // Existing booking overlaps with requested dates
                    {
                      AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        partner: {
          select: {
            id: true,
            businessName: true,
            ratingAverage: true,
            user: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  // Calculate rental duration and total cost for each vehicle
  const vehiclesWithPricing = vehicles.map((vehicle) => {
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);

    const rentalAmount = days >= 1 ? days * vehicle.rentalPricePerDay : hours * vehicle.rentalPricePerHour;

    return {
      ...vehicle,
      estimatedCost: {
        hours,
        days,
        rentalAmount: parseFloat(rentalAmount.toFixed(2)),
        securityDeposit: parseFloat((rentalAmount * 0.2).toFixed(2)), // 20% security
      },
    };
  });

  sendPaginated(res, vehiclesWithPricing, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Create rental booking
 * POST /api/rentals
 * @access Private
 */
exports.createBooking = catchAsync(async (req, res) => {
  const { vehicleId, startDate, endDate, startTime = '00:00', endTime = '23:59', pickupLocation, returnLocation } = req.body;

  // Validation
  if (!vehicleId || !startDate || !endDate || !pickupLocation) {
    return sendError(res, 'Vehicle ID, dates, and pickup location are required', 400, 'VALIDATION_ERROR');
  }

  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  if (start >= end) {
    return sendError(res, 'End date must be after start date', 400, 'INVALID_DATE_RANGE');
  }

  if (start < new Date()) {
    return sendError(res, 'Start date cannot be in the past', 400, 'PAST_DATE');
  }

  // Check if vehicle exists and is available
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: BigInt(vehicleId) },
    include: {
      partner: {
        select: {
          id: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  if (!vehicle.isAvailable) {
    return sendError(res, 'Vehicle is not available for rental', 400, 'VEHICLE_UNAVAILABLE');
  }

  if (!vehicle.isVerified) {
    return sendError(res, 'Vehicle is not verified', 400, 'VEHICLE_NOT_VERIFIED');
  }

  if (vehicle.partner.verificationStatus !== 'approved') {
    return sendError(res, 'Vehicle owner is not verified', 400, 'OWNER_NOT_VERIFIED');
  }

  // Check for conflicting bookings
  const conflictingBooking = await prisma.rentalBooking.findFirst({
    where: {
      vehicleId: BigInt(vehicleId),
      bookingStatus: {
        in: ['pending', 'confirmed', 'active'],
      },
      AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
    },
  });

  if (conflictingBooking) {
    return sendError(res, 'Vehicle is already booked for the selected dates', 409, 'BOOKING_CONFLICT');
  }

  // Calculate rental amount
  const hours = Math.ceil((end - start) / (1000 * 60 * 60));
  const days = Math.ceil(hours / 24);

  const pricePerHour = vehicle.rentalPricePerHour || 0;
  const pricePerDay = vehicle.rentalPricePerDay || 0;

  let totalRentalAmount;
  if (days >= 1) {
    totalRentalAmount = days * pricePerDay;
  } else {
    totalRentalAmount = hours * pricePerHour;
  }

  const securityDeposit = totalRentalAmount * 0.2; // 20% security deposit
  const taxAmount = totalRentalAmount * 0.05; // 5% tax
  const totalAmount = totalRentalAmount + securityDeposit + taxAmount;

  // Create booking
  const booking = await prisma.rentalBooking.create({
    data: {
      passengerId: req.userId,
      vehicleId: BigInt(vehicleId),
      ownerId: vehicle.partnerId,
      startDate: start,
      startTime: startTime,
      endDate: end,
      endTime: endTime,
      rentalDurationHours: hours,
      rentalDurationDays: days,
      pricePerHour,
      pricePerDay,
      totalRentalAmount,
      securityDeposit,
      taxAmount,
      totalAmount,
      pickupLocation,
      returnLocation: returnLocation || pickupLocation,
      bookingStatus: 'pending',
    },
    include: {
      vehicle: {
        select: {
          id: true,
          vehicleType: true,
          vehicleCategory: true,
          manufacturer: true,
          model: true,
          year: true,
          numberPlate: true,
          vehiclePhotos: true,
        },
      },
      owner: {
        select: {
          id: true,
          businessName: true,
          user: {
            select: {
              fullName: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  sendCreated(res, booking, 'Rental booking created successfully. Awaiting owner confirmation.');
});

/**
 * Get booking by ID
 * GET /api/rentals/:id
 * @access Private
 */
exports.getBookingById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.rentalBooking.findUnique({
    where: { id: BigInt(id) },
    include: {
      passenger: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          profilePhotoUrl: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          vehicleType: true,
          vehicleCategory: true,
          manufacturer: true,
          model: true,
          year: true,
          numberPlate: true,
          color: true,
          seatingCapacity: true,
          fuelType: true,
          acAvailable: true,
          vehiclePhotos: true,
          features: true,
        },
      },
      owner: {
        select: {
          id: true,
          businessName: true,
          ratingAverage: true,
          user: {
            select: {
              fullName: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return sendNotFound(res, 'Booking');
  }

  // Check authorization
  const isPassenger = booking.passengerId.toString() === req.userId.toString();
  const isOwner = booking.ownerId.toString() === req.userId.toString();

  if (!isPassenger && !isOwner) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  sendSuccess(res, booking);
});

/**
 * Get user's rental bookings
 * GET /api/rentals/my-bookings
 * @access Private
 */
exports.getMyBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const skip = (page - 1) * limit;
  const where = { passengerId: req.userId };

  if (status) {
    where.bookingStatus = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.rentalBooking.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            vehicleCategory: true,
            manufacturer: true,
            model: true,
            numberPlate: true,
            vehiclePhotos: true,
          },
        },
        owner: {
          select: {
            id: true,
            businessName: true,
            ratingAverage: true,
            user: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    }),
    prisma.rentalBooking.count({ where }),
  ]);

  sendPaginated(res, bookings, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get owner's rental bookings
 * GET /api/rentals/owner-bookings
 * @access Private (Partner)
 */
exports.getOwnerBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  // Get partner ID from user
  const partner = await prisma.partner.findUnique({
    where: { userId: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found', 404, 'PARTNER_NOT_FOUND');
  }

  const skip = (page - 1) * limit;
  const where = { ownerId: partner.id };

  if (status) {
    where.bookingStatus = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.rentalBooking.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        passenger: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            profilePhotoUrl: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            vehicleCategory: true,
            manufacturer: true,
            model: true,
            numberPlate: true,
            vehiclePhotos: true,
          },
        },
      },
    }),
    prisma.rentalBooking.count({ where }),
  ]);

  sendPaginated(res, bookings, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Update booking status (Owner)
 * PUT /api/rentals/:id/status
 * @access Private (Owner)
 */
exports.updateBookingStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  // Validate status
  const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return sendError(res, 'Invalid status', 400, 'INVALID_STATUS');
  }

  const booking = await prisma.rentalBooking.findUnique({
    where: { id: BigInt(id) },
  });

  if (!booking) {
    return sendNotFound(res, 'Booking');
  }

  // Get partner ID
  const partner = await prisma.partner.findUnique({
    where: { userId: req.userId },
  });

  // Check authorization (owner or passenger)
  const isOwner = partner && booking.ownerId.toString() === partner.id.toString();
  const isPassenger = booking.passengerId.toString() === req.userId.toString();

  if (!isOwner && !isPassenger) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Validate status transitions
  if (booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') {
    return sendError(res, 'Cannot update completed or cancelled booking', 400, 'INVALID_TRANSITION');
  }

  if (status === 'cancelled' && !cancellationReason) {
    return sendError(res, 'Cancellation reason is required', 400, 'REASON_REQUIRED');
  }

  // Update booking
  const updatedBooking = await prisma.rentalBooking.update({
    where: { id: BigInt(id) },
    data: {
      bookingStatus: status,
      ...(cancellationReason && { cancellationReason }),
    },
    include: {
      passenger: {
        select: {
          fullName: true,
          phoneNumber: true,
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
  });

  sendSuccess(res, updatedBooking, `Booking ${status} successfully`);
});

/**
 * Cancel booking
 * POST /api/rentals/:id/cancel
 * @access Private
 */
exports.cancelBooking = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return sendError(res, 'Cancellation reason is required', 400, 'REASON_REQUIRED');
  }

  const booking = await prisma.rentalBooking.findUnique({
    where: { id: BigInt(id) },
  });

  if (!booking) {
    return sendNotFound(res, 'Booking');
  }

  // Check authorization
  if (booking.passengerId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Check if booking can be cancelled
  if (booking.bookingStatus === 'completed') {
    return sendError(res, 'Cannot cancel completed booking', 400, 'CANNOT_CANCEL');
  }

  if (booking.bookingStatus === 'cancelled') {
    return sendError(res, 'Booking is already cancelled', 400, 'ALREADY_CANCELLED');
  }

  // Update booking
  const cancelledBooking = await prisma.rentalBooking.update({
    where: { id: BigInt(id) },
    data: {
      bookingStatus: 'cancelled',
      cancellationReason: reason,
    },
  });

  sendSuccess(res, cancelledBooking, 'Booking cancelled successfully');
});

/**
 * Get rental statistics
 * GET /api/rentals/stats
 * @access Private
 */
exports.getRentalStats = catchAsync(async (req, res) => {
  const userId = req.userId;

  const [totalBookings, activeBookings, completedBookings, totalSpent] = await Promise.all([
    prisma.rentalBooking.count({
      where: { passengerId: userId },
    }),
    prisma.rentalBooking.count({
      where: {
        passengerId: userId,
        bookingStatus: { in: ['confirmed', 'active'] },
      },
    }),
    prisma.rentalBooking.count({
      where: {
        passengerId: userId,
        bookingStatus: 'completed',
      },
    }),
    prisma.rentalBooking.aggregate({
      where: {
        passengerId: userId,
        bookingStatus: 'completed',
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const stats = {
    totalBookings,
    activeBookings,
    completedBookings,
    cancelledBookings: totalBookings - activeBookings - completedBookings,
    totalSpent: totalSpent._sum.totalAmount || 0,
  };

  sendSuccess(res, stats);
});

// module.exports = {
//   searchVehicles,
//   createBooking,
//   getBookingById,
//   getMyBookings,
//   getOwnerBookings,
//   updateBookingStatus,
//   cancelBooking,
//   getRentalStats,
// };
