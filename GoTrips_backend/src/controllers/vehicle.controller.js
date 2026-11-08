const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Add new vehicle
 * POST /api/vehicles
 * @access Private (Partner only)
 */
exports.addVehicle = catchAsync(async (req, res) => {
  const {
    vehicleType,
    vehicleCategory,
    manufacturer,
    model,
    year,
    color,
    numberPlate,
    seatingCapacity,
    fuelType,
    acAvailable,
    rentalPricePerHour,
    rentalPricePerDay,
    ridePricePerKm,
    baseFare,
    features,
  } = req.body;

  // Get partner profile
  const partner = await prisma.partner.findUnique({
    where: { user_id: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found. Please register as partner first.', 404, 'PARTNER_NOT_FOUND');
  }

  if (partner.verification_status !== 'approved') {
    return sendError(res, 'Partner verification pending or rejected', 403, 'PARTNER_NOT_VERIFIED');
  }

  // Check if number plate already exists
  const existingVehicle = await prisma.vehicle.findUnique({
    where: { number_plate: numberPlate.toUpperCase() },
  });

  if (existingVehicle) {
    return sendError(res, 'Vehicle with this number plate already exists', 409, 'VEHICLE_EXISTS');
  }

  // Validate pricing based on vehicle type
  if (vehicleType === 'rental_car' || vehicleType === 'commercial_vehicle') {
    if (!rentalPricePerHour && !rentalPricePerDay) {
      return sendError(res, 'Rental pricing is required for rental vehicles', 400, 'PRICING_REQUIRED');
    }
  }

  if (vehicleType === 'taxi' || vehicleType === 'bike') {
    if (!ridePricePerKm || !baseFare) {
      return sendError(res, 'Ride pricing is required for taxi/bike', 400, 'PRICING_REQUIRED');
    }
  }

  // Create vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      partner_id: partner.partner_id,
      vehicle_type: vehicleType,
      vehicle_category: vehicleCategory,
      manufacturer,
      model,
      year: year ? parseInt(year) : null,
      color,
      number_plate: numberPlate.toUpperCase(),
      seating_capacity: seatingCapacity ? parseInt(seatingCapacity) : null,
      fuel_type: fuelType,
      ac_available: acAvailable || false,
      rental_price_per_hour: rentalPricePerHour ? parseFloat(rentalPricePerHour) : null,
      rental_price_per_day: rentalPricePerDay ? parseFloat(rentalPricePerDay) : null,
      ride_price_per_km: ridePricePerKm ? parseFloat(ridePricePerKm) : null,
      base_fare: baseFare ? parseFloat(baseFare) : null,
      features: features || [],
      is_available: true,
      is_verified: false, // Requires admin verification
    },
    include: {
      partner: {
        select: {
          partner_id: true,
          business_name: true,
          user: {
            select: {
              full_name: true,
              phone_number: true,
            },
          },
        },
      },
    },
  });

  sendCreated(res, vehicle, 'Vehicle added successfully. Awaiting verification.');
});

/**
 * Get vehicle by ID
 * GET /api/vehicles/:id
 * @access Public
 */
exports.getVehicleById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: BigInt(id) },
    include: {
      partner: {
        select: {
          partner_id: true,
          business_name: true,
          rating_average: true,
          total_rides_completed: true,
          user: {
            select: {
              full_name: true,
              phone_number: true,
            },
          },
        },
      },
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  sendSuccess(res, vehicle);
});

/**
 * Get all vehicles with filters
 * GET /api/vehicles
 * @access Public
 */
exports.getAllVehicles = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    vehicleType,
    vehicleCategory,
    isAvailable,
    isVerified,
    fuelType,
    acAvailable,
    minSeats,
    maxPrice,
    partnerId,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = req.query;

  const skip = (page - 1) * limit;
  const where = {};

  if (vehicleType) {
    where.vehicle_type = vehicleType;
  }

  if (vehicleCategory) {
    where.vehicle_category = vehicleCategory;
  }

  if (isAvailable !== undefined) {
    where.is_available = isAvailable === 'true';
  }

  if (isVerified !== undefined) {
    where.is_verified = isVerified === 'true';
  }

  if (fuelType) {
    where.fuel_type = fuelType;
  }

  if (acAvailable !== undefined) {
    where.ac_available = acAvailable === 'true';
  }

  if (minSeats) {
    where.seating_capacity = { gte: parseInt(minSeats) };
  }

  if (partnerId) {
    where.partner_id = BigInt(partnerId);
  }

  if (search) {
    where.OR = [
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { number_plate: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (maxPrice) {
    where.OR = [
      { rental_price_per_day: { lte: parseFloat(maxPrice) } },
      { ride_price_per_km: { lte: parseFloat(maxPrice) } },
    ];
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        partner: {
          select: {
            partner_id: true,
            business_name: true, 
            rating_average: true,
            user: {
              select: {
                full_name: true,
                phone_number: true,
              },
            },
          },
        },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  sendPaginated(res, vehicles, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get partner's vehicles
 * GET /api/vehicles/my-vehicles
 * @access Private (Partner)
 */
exports.getMyVehicles = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    isAvailable,
    isVerified,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = req.query;

  // Get partner profile
  const partner = await prisma.partner.findUnique({
    where: { user_id: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found', 404, 'PARTNER_NOT_FOUND');
  }

  const skip = (page - 1) * limit;
  const where = { partner_id: partner.id };


  if (isAvailable !== undefined) {
    where.is_available = isAvailable === 'true';
  }

  if (isVerified !== undefined) {
    where.is_verified = isVerified === 'true';
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.vehicle.count({ where }),
  ]);

  sendPaginated(res, vehicles, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Update vehicle
 * PUT /api/vehicles/:id
 * @access Private (Partner - owner only)
 */
exports.updateVehicle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    vehicleCategory,
    color,
    seatingCapacity,
    acAvailable,
    rentalPricePerHour,
    rentalPricePerDay,
    ridePricePerKm,
    baseFare,
    features,
  } = req.body;
  console.log(req.body);
  

  // Get vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: BigInt(id) },
    include: {
      partner: true,
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  // Check authorization
  if (vehicle.partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Update vehicle
  const updatedVehicle = await prisma.vehicle.update({
    where: { vehicle_id: BigInt(id) },
    data: {
      ...(vehicleCategory && { vehicle_category: vehicleCategory }),
      ...(color && { color: color }),
      ...(seatingCapacity && { seating_capacity: parseInt(seatingCapacity) }),
      ...(acAvailable !== undefined && { ac_available: acAvailable }),
      ...(rentalPricePerHour && { rental_price_per_hour: parseFloat(rentalPricePerHour) }),
      ...(rentalPricePerDay && { rental_price_per_day: parseFloat(rentalPricePerDay) }),
      ...(ridePricePerKm && { ride_price_per_km: parseFloat(ridePricePerKm) }),
      ...(baseFare && { base_fare: parseFloat(baseFare) }),
      ...(features && { features: features }),
    },
  });

  sendSuccess(res, updatedVehicle, 'Vehicle updated successfully');
});

/**
 * Upload vehicle photos
 * POST /api/vehicles/:id/photos
 * @access Private (Partner)
 */
exports.uploadVehiclePhotos = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Get vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: BigInt(id) },
    include: {
      partner: true,
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  // Check authorization
  if (vehicle.partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No files uploaded', 400, 'FILES_REQUIRED');
  }

  // Get uploaded photo URLs
  const photoUrls = req.files.map((file) => file.url);

  // Combine with existing photos
  const existingPhotos = vehicle.vehicle_photos || [];
  const updatedPhotos = [...existingPhotos, ...photoUrls];

  // Update vehicle
  const updatedVehicle = await prisma.vehicle.update({
    where: { vehicle_id: BigInt(id) },
    data: {
      vehicle_photos: updatedPhotos,
    },
    select: {
      vehicle_id: true,
      vehicle_photos: true,
    },
  });

  sendSuccess(res, updatedVehicle, 'Photos uploaded successfully');
});

/**
 * Delete vehicle photo
 * DELETE /api/vehicles/:id/photos/:photoIndex
 * @access Private (Partner)
 */
exports.deleteVehiclePhoto = catchAsync(async (req, res) => {
  const { id, photoIndex } = req.params;

  // Get vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: BigInt(id) },
    include: {
      partner: true,
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  // Check authorization
  if (vehicle.partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const photos = vehicle.vehicle_photos || [];
  const index = parseInt(photoIndex);

  if (index < 0 || index >= photos.length) {
    return sendError(res, 'Invalid photo index', 400, 'INVALID_INDEX');
  }

  // Remove photo
  photos.splice(index, 1);

  // Update vehicle
  const updatedVehicle = await prisma.vehicle.update({
    where: { vehicle_id: BigInt(id) },
    data: {
      vehicle_photos: photos,
    },
    select: {
      vehicle_id: true,
      vehicle_photos: true,
    },
  });

  sendSuccess(res, updatedVehicle, 'Photo deleted successfully');
});

/**
 * Toggle vehicle availability
 * PUT /api/vehicles/:id/availability
 * @access Private (Partner)
 */
exports.toggleAvailability = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  // Get vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: BigInt(id) },
    include: {
      partner: true,
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  // Check authorization
  if (vehicle.partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Update availability
  const updatedVehicle = await prisma.vehicle.update({
    where: { vehicle_id: BigInt(id) },
    data: {
      is_available: isAvailable !== undefined ? isAvailable : !vehicle.is_available,
    },
    select: {
      vehicle_id: true,
      manufacturer: true,
      model: true,
      number_plate: true,
      is_available: true,
    },
  });

  sendSuccess(
    res,
    updatedVehicle,
    updatedVehicle.is_available ? 'Vehicle is now available' : 'Vehicle is now unavailable'
  );
});

/**
 * Delete vehicle
 * DELETE /api/vehicles/:id
 * @access Private (Partner)
 */
exports.deleteVehicle = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Get vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: BigInt(id) },
    include: {
      partner: true,
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  // Check authorization
  if (vehicle.partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Check for active bookings or rides
  const [activeRides, activeBookings] = await Promise.all([
    prisma.ride.count({
      where: {
        vehicle_id: BigInt(id),
        ride_status: { in: ['pending', 'accepted', 'started'] },
      },
    }),
    prisma.rentalBooking.count({
      where: {
        vehicle_id: BigInt(id),
        booking_status: { in: ['pending', 'confirmed', 'active'] },
      },
    }),
  ]);

  if (activeRides > 0 || activeBookings > 0) {
    return sendError(
      res,
      'Cannot delete vehicle with active rides or bookings',
      400,
      'ACTIVE_BOOKINGS_EXIST'
    );
  }

  // Soft delete by making unavailable
  await prisma.vehicle.update({
    where: { vehicle_id: BigInt(id) },
    data: {
      is_available: false,
      is_verified: false,
    },
  });

  sendSuccess(res, null, 'Vehicle deleted successfully');
});

/**
 * Get vehicle statistics
 * GET /api/vehicles/:id/stats
 * @access Private (Partner - owner only)
 */
exports.getVehicleStats = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Get vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: BigInt(id) },
    include: {
      partner: true,
    },
  });

  if (!vehicle) {
    return sendNotFound(res, 'Vehicle');
  }

  // Check authorization
  if (vehicle.partner.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const vehicleId = BigInt(id);

  // Fetch statistics
  const [totalRides, completedRides, totalRentals, completedRentals, totalEarnings] = await Promise.all([
    prisma.ride.count({
      where: { vehicleId },
    }),
    prisma.ride.count({
      where: {
        vehicleId,
        rideStatus: 'completed',
      },
    }),
    prisma.rentalBooking.count({
      where: { vehicleId },
    }),
    prisma.rentalBooking.count({
      where: {
        vehicleId,
        bookingStatus: 'completed',
      },
    }),
    prisma.rentalBooking.aggregate({
      where: {
        vehicleId,
        bookingStatus: 'completed',
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const stats = {
    rides: {
      total: totalRides,
      completed: completedRides,
    },
    rentals: {
      total: totalRentals,
      completed: completedRentals,
    },
    earnings: {
      total: totalEarnings._sum.totalAmount || 0,
    },
    rating: vehicle.ratingAverage,
    totalTrips: vehicle.totalTrips,
  };

  sendSuccess(res, stats);
});

/**
 * Get vehicle reviews
 * GET /api/vehicles/:id/reviews
 * @access Public
 */
exports.getVehicleReviews = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.ratingReview.findMany({
      where: {
        vehicleId: BigInt(id),
        isVisible: true,
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            fullName: true,
            profilePhotoUrl: true,
          },
        },
      },
    }),
    prisma.ratingReview.count({
      where: {
        vehicleId: BigInt(id),
        isVisible: true,
      },
    }),
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

// module.exports = {
//   addVehicle,
//   getVehicleById,
//   getAllVehicles,
//   getMyVehicles,
//   updateVehicle,
//   uploadVehiclePhotos,
//   deleteVehiclePhoto,
//   toggleAvailability,
//   deleteVehicle,
//   getVehicleStats,
//   getVehicleReviews,
// };