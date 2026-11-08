const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');
// const { generateOTP, calculateDistance } = require('../utils/helpers');

// =====================================================
// PARTNER: CREATE & MANAGE RIDES
// =====================================================

/**
 * Create a new ride (PARTNER ONLY)
 * POST /api/rides/create
 * @access Private (Partner)
 */
exports.createRide = catchAsync(async (req, res) => {
  try {
    const {
      rideType,
      vehicleId,
      pickupLocationLat,
      pickupLocationLng,
      pickupAddress,
      dropLocationLat,
      dropLocationLng,
      dropAddress,
      totalSeats,
      totalCapacityKg,
      fareAmount,
      pricePerSeat,
      pricePerKm,
      baseFare,
      scheduledDepartureTime,
      rideCategory,
      allowPets,
      allowSmoking,
      allowLuggage,
      maxLuggageKg,
      rideNotes,
    } = req.body;

    console.log(req.body);

    // Verify user is a partner
    const partner = await prisma.partner.findUnique({
      where: { user_id: req.userId },
    });

    if (!partner) {
      return sendError(res, 'Only partners can create rides', 403, 'NOT_A_PARTNER');
    }

    if (partner.verification_status !== 'approved') {
      return sendError(res, 'Your partner account must be verified first', 403, 'NOT_VERIFIED');
    }

    // Verify vehicle belongs to partner
    const vehicle = await prisma.vehicle.findUnique({
      where: { vehicle_id: BigInt(vehicleId) },
    });

    if (!vehicle) {
      return sendNotFound(res, 'Vehicle');
    }

    if (vehicle.partner_id.toString() !== partner.partner_id.toString()) {
      return sendError(res, 'This vehicle does not belong to you', 403, 'FORBIDDEN');
    }

    if (!vehicle.is_verified) {
      return sendError(res, 'Vehicle must be verified before creating rides', 400, 'VEHICLE_NOT_VERIFIED');
    }

    // Validation based on ride type
    if (rideType === 'fixed_route') {
      // if (!dropLocationLat || !dropLocationLng || !dropAddress) {
      if (!dropAddress) {
        return sendError(res, 'Destination is required for fixed route rides', 400, 'DESTINATION_REQUIRED');
      }
      if (!fareAmount && !pricePerSeat) {
        return sendError(res, 'Fare or price per seat is required for fixed route rides', 400, 'FARE_REQUIRED');
      }
    }

    if (rideType === 'open_ride') {
      if (!pricePerKm && !baseFare) {
        return sendError(res, 'Price per km or base fare is required for open rides', 400, 'PRICING_REQUIRED');
      }
    }

    // // Calculate distance for fixed route
    // let distanceKm = null;
    // let estimatedDurationMinutes = null;

    // if (rideType === 'fixed_route') {
    //   distanceKm = calculateDistance(
    //     parseFloat(pickupLocationLat),
    //     parseFloat(pickupLocationLng),
    //     parseFloat(dropLocationLat),
    //     parseFloat(dropLocationLng)
    //   );
    //   estimatedDurationMinutes = Math.round((distanceKm / 40) * 60); // Assuming 40 km/h
    // }

    console.log(scheduledDepartureTime);
    
    // Create the ride
    const ride = await prisma.ride.create({
      data: {  
        created_by: req.userId,
        ride_type: rideType,
        vehicle_id: BigInt(vehicleId),
        driver_id: partner.partner_id,

        // pickup_location_lat: parseFloat(pickupLocationLat),
        // pickup_location_lng: parseFloat(pickupLocationLng),
        pickup_address: pickupAddress,

        ...(rideType === 'fixed_route' && {
          // drop_location_lat: parseFloat(dropLocationLat),
          // drop_location_lng: parseFloat(dropLocationLng),
          drop_address: dropAddress,
          // distance_km: distanceKm,
          // duration_minutes: estimatedDurationMinutes,
        }),

        total_seats: totalSeats || vehicle.seatingCapacity,
        available_seats: totalSeats || vehicle.seatingCapacity,
        total_capacity_kg: totalCapacityKg || null,
        available_capacity_kg: totalCapacityKg || null,

        fare_amount: fareAmount ? parseFloat(fareAmount) : null,
        price_per_seat: pricePerSeat ? parseFloat(pricePerSeat) : null,
        price_per_km: pricePerKm ? parseFloat(pricePerKm) : null,
        base_fare: baseFare ? parseFloat(baseFare) : null,

        scheduled_departure_time: scheduledDepartureTime ? new Date(scheduledDepartureTime)  : null,
        ride_category: rideCategory || 'economy',

        allow_pets: allowPets || false,
        allow_smoking: allowSmoking || false,
        allow_luggage: allowLuggage !== undefined ? allowLuggage : true,
        max_luggage_kg: maxLuggageKg ? parseFloat(maxLuggageKg) : null,
        ride_notes: rideNotes,
        is_published: true,
        ride_status: scheduledDepartureTime ? 'scheduled' : 'pending',
      },
      include: {
        vehicle: {
          select: {
            manufacturer: true,
            model: true,
            number_plate: true,
            vehicle_type: true,
          },
        },
      },
    });

 

    sendCreated(res, response, `${rideType === 'fixed_route' ? 'Fixed route' : 'Open'} ride created successfully`);
  } catch (error) {
    console.error(`Error creating ride for user ${req.userId}:`, error);
    return sendError(res, 'Failed to create ride', 500, 'CREATE_RIDE_FAILED');
  }
});

/**
 * Get partner's rides
 * GET /api/rides/my-rides
 * @access Private (Partner)
 */
exports.getMyCreatedRides = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, rideStatus, rideType } = req.query;

  const skip = (page - 1) * limit;
  const where = { created_by: req.userId };

  if (rideStatus) {
    where.ride_status = rideStatus;
  }

  if (rideType) {
    where.ride_type = rideType;
  }

  const [rides, total] = await Promise.all([
    prisma.ride.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { created_at: 'desc' },
      include: {
        vehicle: {
          select: {
            manufacturer: true,
            model: true,
            number_plate: true,
            vehicle_type: true,
          },
        },
        rideBookings: {
          select: {
            booking_id: true,
            seats_booked: true,
            booking_status: true,
            user: {
              select: {
                full_name: true,
                phone_number: true,
              },
            },
          },
        },
        _count: {
          select: {
            rideBookings: true,
          },
        },
      },
    }),
    prisma.ride.count({ where }),
  ]);


  sendPaginated(res, rides, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Update ride details (PARTNER ONLY)
 * PUT /api/rides/:id
 * @access Private (Partner - Creator only)
 */
exports.updateRide = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    // pickupLocationLat,
    // pickupLocationLng,
    pickupAddress,
    // dropLocationLat,
    // dropLocationLng,
    dropAddress,
    fareAmount,
    pricePerSeat,
    scheduledDepartureTime,
    allowPets,
    allowSmoking,
    allowLuggage,
    maxLuggageKg,
    rideNotes,
  } = req.body;

  const ride = await prisma.ride.findUnique({
    where: { ride_id: BigInt(id) },
  });

  if (!ride) {
    return sendNotFound(res, 'Ride');
  }

  if (ride.created_by.toString() !== req.userId.toString()) {
    return sendError(res, 'Only the ride creator can update this ride', 403, 'FORBIDDEN');
  }

  // Cannot update if ride has started
  if (['started', 'completed', 'cancelled'].includes(ride.ride_status)) {
    return sendError(res, 'Cannot update ride in current status', 400, 'CANNOT_UPDATE');
  }

  const updated = await prisma.ride.update({
    where: { ride_id: BigInt(id) },
    data: {
      // pickup_location_lat: pickupLocationLat ? parseFloat(pickupLocationLat) : undefined,
      // pickup_location_lng: pickupLocationLng ? parseFloat(pickupLocationLng) : undefined,
      pickup_address: pickupAddress,
      // drop_location_lat: dropLocationLat ? parseFloat(dropLocationLat) : undefined,
      // drop_location_lng: dropLocationLng ? parseFloat(dropLocationLng) : undefined,
      drop_address: dropAddress,
      fare_amount: fareAmount ? parseFloat(fareAmount) : undefined,
      price_per_seat: pricePerSeat ? parseFloat(pricePerSeat) : undefined,
      scheduled_departure_time: scheduledDepartureTime,
      allow_pets: allowPets,
      allow_smoking: allowSmoking,
      allow_luggage: allowLuggage,
      max_luggage_kg: maxLuggageKg ? parseFloat(maxLuggageKg) : undefined,
      ride_notes: rideNotes,
    },
  });

  sendSuccess(res, updated, 'Ride updated successfully');
});

/**
 * Cancel ride (PARTNER ONLY)
 * POST /api/rides/:id/cancel
 * @access Private (Partner - Creator only)
 */
exports.cancelRide = catchAsync(async (req, res) => {
  const { id } = req.params;
  // let cancellationReason="Deleted for any reasot";
  // cancellationReason  = req.body.cancellationReason;

  const ride = await prisma.ride.findUnique({
    where: { ride_id: BigInt(id) },
    include: {
      rideBookings: {
        where: { booking_status: 'confirmed' },
      },
    },
  });

  if (!ride) {
    return sendNotFound(res, 'Ride');
  }

  if (ride.created_by.toString() !== req.userId.toString()) {
    return sendError(res, 'Only the ride creator can cancel this ride', 403, 'FORBIDDEN');
  }

  if (ride.ride_status === 'cancelled') {
    return sendError(res, 'Ride is already cancelled', 400, 'ALREADY_CANCELLED');
  }

  // Cancel all confirmed bookings
  if (ride.rideBookings.length > 0) {
    await prisma.rideBooking.updateMany({
      where: {
        ride_id: BigInt(id),
        booking_status: 'confirmed',
      },
      data: {
        booking_status: 'cancelled',
        cancellation_reason: 'Ride cancelled by partner',
      },
    });

    // TODO: Process refunds for all bookings
    // TODO: Send notifications to all users
  }

  const updated = await prisma.ride.update({
    where: { ride_id: BigInt(id) },
    data: {
      ride_status: 'cancelled',
      // cancellation_reason: cancellationReason || "Deleting",
    },
  });

  sendSuccess(res, updated, 'Ride cancelled successfully');
});

// =====================================================
// USER: SEARCH & BOOK RIDES
// =====================================================

/**
 * Search available rides (PUBLIC/USER)
 * GET /api/rides/search
 * @access Public
 */
exports.
searchRides = catchAsync(async (req, res) => {
  const { rideType, pickupLat, pickupLng, dropLat, dropLng, seats, departureDate, maxFare, vehicleType, page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;
  const where = {
    isPublished: true,
    rideStatus: { in: ['pending', 'scheduled'] },
  };

  if (rideType) {
    where.rideType = rideType;
  }

  if (seats) {
    where.availableSeats = { gte: parseInt(seats) };
  }

  if (departureDate) {
    const startOfDay = new Date(departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(departureDate);
    endOfDay.setHours(23, 59, 59, 999);

    where.scheduledDepartureTime = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  if (maxFare) {
    where.OR = [{ fareAmount: { lte: parseFloat(maxFare) } }, { pricePerSeat: { lte: parseFloat(maxFare) } }];
  }

  if (vehicleType) {
    where.vehicle = {
      vehicleType,
    };
  }

  const [rides, total] = await Promise.all([
    prisma.ride.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { scheduledDepartureTime: 'asc' },
      include: {
        vehicle: {
          select: {
            manufacturer: true,
            model: true,
            vehicleType: true,
            vehicleCategory: true,
            acAvailable: true,
            seatingCapacity: true,
            ratingAverage: true,
          },
        },
        driver: {
          include: {
            user: {
              select: {
                fullName: true,
                profilePhotoUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            rideBookings: true,
          },
        },
      },
    }),
    prisma.ride.count({ where }),
  ]);

  // Calculate distance from user's location (if provided)
  if (pickupLat && pickupLng) {
    rides.forEach((ride) => {
      ride.distanceFromUser = calculateDistance(parseFloat(pickupLat), parseFloat(pickupLng), parseFloat(ride.pickupLocationLat), parseFloat(ride.pickupLocationLng));
    });

    // Sort by distance
    rides.sort((a, b) => a.distanceFromUser - b.distanceFromUser);
  }

  sendPaginated(res, rides, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get ride details
 * GET /api/rides/:id
 * @access Public
 */
exports.getRideById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const ride = await prisma.ride.findUnique({
    where: { rideId: BigInt(id) },
    include: {
      vehicle: true,
      driver: {
        include: {
          user: {
            select: {
              fullName: true,
              profilePhotoUrl: true,
              phoneNumber: true,
            },
          },
        },
      },
      rideBookings: {
        where: { bookingStatus: { in: ['confirmed', 'pending'] } },
        select: {
          bookingId: true,
          seatsBooked: true,
          bookingStatus: true,
        },
      },
    },
  });

  if (!ride) {
    return sendNotFound(res, 'Ride');
  }

  // Mask phone number for non-open rides
  if (ride.rideType !== 'open_ride' && ride.driver?.user?.phoneNumber) {
    ride.driver.user.phoneNumber = ride.driver.user.phoneNumber.slice(0, -4).replace(/./g, '*') + ride.driver.user.phoneNumber.slice(-4);
  }

  sendSuccess(res, ride);
});

/**
 * Book a ride (USER ONLY)
 * POST /api/rides/:id/book
 * @access Private (User)
 */
exports.bookRide = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { seatsBooked, capacityBookedKg, pickupLocationLat, pickupLocationLng, pickupAddress, dropLocationLat, dropLocationLng, dropAddress, specialRequests } = req.body;

  const ride = await prisma.ride.findUnique({
    where: { rideId: BigInt(id) },
    include: {
      vehicle: true,
      driver: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!ride) {
    return sendNotFound(res, 'Ride');
  }

  // Cannot book own ride
  if (ride.createdBy.toString() === req.userId.toString()) {
    return sendError(res, 'Cannot book your own ride', 400, 'CANNOT_BOOK_OWN_RIDE');
  }

  // Check ride status
  if (!['pending', 'scheduled'].includes(ride.rideStatus)) {
    return sendError(res, 'This ride is not available for booking', 400, 'RIDE_NOT_AVAILABLE');
  }

  // Check if already booked
  const existingBooking = await prisma.rideBooking.findFirst({
    where: {
      rideId: BigInt(id),
      userId: req.userId,
      bookingStatus: { in: ['pending', 'confirmed'] },
    },
  });

  if (existingBooking) {
    return sendError(res, 'You have already booked this ride', 409, 'ALREADY_BOOKED');
  }

  // Check seat availability
  if (seatsBooked && ride.availableSeats < seatsBooked) {
    return sendError(res, `Only ${ride.availableSeats} seats available`, 400, 'INSUFFICIENT_SEATS');
  }

  // Validate based on ride type
  if (ride.rideType === 'open_ride') {
    if (!pickupLocationLat || !pickupLocationLng || !dropLocationLat || !dropLocationLng) {
      return sendError(res, 'Pickup and drop locations are required for open rides', 400, 'LOCATION_REQUIRED');
    }
  }

  // Calculate fare
  let fareAmount = 0;

  if (ride.rideType === 'fixed_route') {
    if (ride.pricePerSeat) {
      fareAmount = ride.pricePerSeat * (seatsBooked || 1);
    } else {
      fareAmount = ride.fareAmount;
    }
  } else {
    // For open_ride, calculate based on distance
    const distance = calculateDistance(parseFloat(pickupLocationLat), parseFloat(pickupLocationLng), parseFloat(dropLocationLat), parseFloat(dropLocationLng));
    fareAmount = (ride.baseFare || 0) + ride.pricePerKm * distance;
  }

  // Create booking
  const booking = await prisma.rideBooking.create({
    data: {
      rideId: BigInt(id),
      userId: req.userId,
      seatsBooked: seatsBooked || 1,
      capacityBookedKg: capacityBookedKg ? parseFloat(capacityBookedKg) : null,
      fareAmount,
      bookingStatus: ride.rideType === 'open_ride' ? 'pending' : 'confirmed',
      pickupLocationLat: pickupLocationLat ? parseFloat(pickupLocationLat) : null,
      pickupLocationLng: pickupLocationLng ? parseFloat(pickupLocationLng) : null,
      pickupAddress: pickupAddress || null,
      dropLocationLat: dropLocationLat ? parseFloat(dropLocationLat) : null,
      dropLocationLng: dropLocationLng ? parseFloat(dropLocationLng) : null,
      dropAddress: dropAddress || null,
      specialRequests,
    },
    include: {
      ride: {
        include: {
          vehicle: true,
          driver: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Update ride available seats (only for confirmed bookings)
  if (booking.bookingStatus === 'confirmed') {
    await prisma.ride.update({
      where: { rideId: BigInt(id) },
      data: {
        availableSeats: { decrement: seatsBooked || 1 },
      },
    });
  }

  // TODO: Send notification to partner

  const message = ride.rideType === 'open_ride' ? 'Booking request sent. Driver will contact you shortly.' : 'Ride booked successfully!';

  sendCreated(res, booking, message);
});

/**
 * Get my bookings (USER)
 * GET /api/rides/my-bookings
 * @access Private (User)
 */
exports.getMyBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, bookingStatus } = req.query;

  const skip = (page - 1) * limit;
  const where = { userId: req.userId };

  if (bookingStatus) {
    where.bookingStatus = bookingStatus;
  }

  const [bookings, total] = await Promise.all([
    prisma.rideBooking.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        ride: {
          include: {
            vehicle: {
              select: {
                manufacturer: true,
                model: true,
                numberPlate: true,
              },
            },
            driver: {
              include: {
                user: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.rideBooking.count({ where }),
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
 * Cancel booking (USER)
 * POST /api/rides/bookings/:id/cancel
 * @access Private (User)
 */
exports.cancelBooking = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { cancellationReason } = req.body;

  const booking = await prisma.rideBooking.findUnique({
    where: { bookingId: BigInt(id) },
    include: {
      ride: true,
    },
  });

  if (!booking) {
    return sendNotFound(res, 'Booking');
  }

  if (booking.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  if (booking.bookingStatus === 'cancelled') {
    return sendError(res, 'Booking is already cancelled', 400, 'ALREADY_CANCELLED');
  }

  // Update booking
  const updated = await prisma.rideBooking.update({
    where: { bookingId: BigInt(id) },
    data: {
      bookingStatus: 'cancelled',
      cancellationReason,
    },
  });

  // Return seats to ride
  if (booking.bookingStatus === 'confirmed') {
    await prisma.ride.update({
      where: { rideId: booking.rideId },
      data: {
        availableSeats: { increment: booking.seatsBooked },
      },
    });
  }

  // TODO: Process refund
  // TODO: Send notification to partner

  sendSuccess(res, updated, 'Booking cancelled successfully');
});

// module.exports = {
//   // Partner routes
//   createRide,
//   getMyCreatedRides,
//   updateRide,
//   cancelRide,

//   // User routes
//   searchRides,
//   getRideById,
//   bookRide,
//   getMyBookings,
//   cancelBooking,
// };
