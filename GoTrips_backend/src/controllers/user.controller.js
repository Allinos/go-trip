const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');
const { NotFoundError, AuthorizationError } = require('../middleware/error.middleware');

/**
 * Get user profile by ID
 * GET /users/:id
 * @access Private (users can only view their own profile unless admin)
 */
exports.getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if user is accessing their own profile
  if (req.userId.toString() !== id && req.user.userType !== 'admin') {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const user = await prisma.user.findUnique({
    where: { user_id: BigInt(id) },
    select: {
      user_id: true,
      phone_number: true,
      country_code: true,
      full_name: true,
      email: true,
      profile_photo_url: true,
      date_of_birth: true,
      gender: true,
      user_type: true,
      is_verified: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      last_login: true,
    },
  });

  if (!user) {
    return sendNotFound(res, 'User');
  }

  sendSuccess(res, user);
});

/**
 * Get all users (Admin only)
 * GET /users
 * @access Private (Admin only)
 */
exports.getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, userType, isActive, isVerified } = req.query;

  const skip = (page - 1) * limit;

  // Build where clause
  const where = {};

  if (search) {
    where.OR = [{ fullName: { contains: search, mode: 'insensitive' } }, { phoneNumber: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }];
  }

  if (userType) {
    where.userType = userType;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  if (isVerified !== undefined) {
    where.isVerified = isVerified === 'true';
  }

  // Fetch users and count
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        email: true,
        profilePhotoUrl: true,
        userType: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendPaginated(res, users, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Update user profile
 * PUT /users/:id
 * @access Private (users can only update their own profile)
 */
exports.updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { fullName, email, dateOfBirth, gender } = req.body;

  // Check if user is updating their own profile
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { user_id: BigInt(id) },
  });

  if (!existingUser) {
    return sendNotFound(res, 'User not found!');
  }

  // Check if email is already taken by another user
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findFirst({
      where: {
        email,
        NOT: { user_id: BigInt(id) },
      },
    });

    if (emailExists) {
      return sendError(res, 'Email already in use', 409, 'EMAIL_EXISTS');
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { user_id: BigInt(id) },
    data: {
      ...(fullName && { full_name }),
      ...(email && { email }),
      ...(dateOfBirth && { date_of_birth: new Date(dateOfBirth) }),
      ...(gender && { gender }),
    },
    select: {
      id: true,
      phone_number: true,
      full_name: true,
      email: true,
      profile_photo_url: true,
      date_of_birth: true,
      gender: true,
      user_type: true,
      is_verified: true,
      updated_at: true,
    },
  });

  sendSuccess(res, updatedUser, 'Profile updated successfully');
});

/**
 * Update profile photo
 * POST /users/:id/profile-photo
 * @access Private
 */
exports.updateProfilePhoto = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if user is updating their own profile
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  if (!req.file) {
    return sendError(res, 'No file uploaded', 400, 'FILE_REQUIRED');
  }

  const photoUrl = req.file.url; // Set by upload middleware

  // Update user profile photo
  const updatedUser = await prisma.user.update({
    where: { user_id: BigInt(id) },
    data: { profile_photo_url: photoUrl },
    select: {
      user_id: true,
      full_name: true,
      profile_photo_url: true,
    },
  });

  sendSuccess(res, updatedUser, 'Profile photo updated successfully');
});

/**
 * Delete/Deactivate user account
 * DELETE /users/:id
 * @access Private
 */
exports.deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if user is deleting their own account
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Soft delete by deactivating account
  await prisma.user.update({
    where: { user_id: BigInt(id) },
    data: {
      is_active: false,
      email: null, // Clear sensitive data
      full_name: 'Deleted User',
    },
  });

  sendSuccess(res, null, 'Account deactivated successfully');
});

/**
 * Get user's saved locations
 * GET /users/:id/saved-locations
 * @access Private
 */
exports.getSavedLocations = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if user is accessing their own locations
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const locations = await prisma.userSavedLocation.findMany({
    where: { user_id: BigInt(id) },
    orderBy: { created_at: 'desc' },
  });

  sendSuccess(res, locations);
});

/**
 * Add saved location
 * POST /users/:id/saved-locations
 * @access Private
 */
exports.addSavedLocation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { locationType, locationName, address, latitude, longitude, landmark } = req.body;

  // Check if user is adding to their own account
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Validation
  if (!locationType || !address) {
    return sendError(res, 'Location type and address are required', 400, 'VALIDATION_ERROR');
  }

  // Check if this location type already exists for user
  const existingLocation = await prisma.userSavedLocation.findFirst({
    where: {
      user_id: BigInt(id),
      location_type: locationType,
    },
  });

  if (existingLocation) {
    // Update existing location
    const updated = await prisma.userSavedLocation.update({
      where: { id: existingLocation.id },
      data: {
        location_name: locationName,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        landmark,
      },
    });

    return sendSuccess(res, updated, 'Saved location updated successfully');
  }

  // Create new location
  const location = await prisma.userSavedLocation.create({
    data: {
      user_id: BigInt(id),
      location_type: locationType,
      location_name: locationName,
      address,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      landmark,
    },
  });

  sendCreated(res, location, 'Location saved successfully');
});

/**
 * Update saved location
 * PUT /users/:id/saved-locations/:locationId
 * @access Private
 */
exports.updateSavedLocation = catchAsync(async (req, res) => {
  const { id, locationId } = req.params;
  const { locationName, address, latitude, longitude, landmark } = req.body;

  // Check if user is updating their own location
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Check if location exists and belongs to user
  const location = await prisma.userSavedLocation.findFirst({
    where: {
      id: BigInt(locationId),
      userId: BigInt(id),
    },
  });

  if (!location) {
    return sendNotFound(res, 'Saved location');
  }

  // Update location
  const updated = await prisma.userSavedLocation.update({
    where: { id: BigInt(locationId) },
    data: {
      ...(locationName && { location_name: locationName }),
      ...(address && { address }),
      ...(latitude && { latitude: parseFloat(latitude) }),
      ...(longitude && { longitude: parseFloat(longitude) }),
      ...(landmark !== undefined && { landmark }),
    },
  });

  sendSuccess(res, updated, 'Location updated successfully');
});

/**
 * Delete saved location
 * DELETE /users/:id/saved-locations/:locationId
 * @access Private
 */
exports.deleteSavedLocation = catchAsync(async (req, res) => {
  const { id, locationId } = req.params;

  // Check if user is deleting their own location
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Check if location exists and belongs to user
  const location = await prisma.userSavedLocation.findFirst({
    where: {
      id: BigInt(locationId),
      user_id: BigInt(id),
    },
  });

  if (!location) {
    return sendNotFound(res, 'Saved location');
  }

  // Delete location
  await prisma.userSavedLocation.delete({
    where: { id: BigInt(locationId) },
  });

  sendSuccess(res, null, 'Location deleted successfully');
});

/**
 * Get user statistics
 * GET /users/:id/stats
 * @access Private
 */
exports.getUserStats = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if user is accessing their own stats
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const userId = BigInt(id);

  // Fetch user stats
  const [totalRides, completedRides, cancelledRides, totalSpent, savedLocationsCount] = await Promise.all([
    prisma.ride.count({
      where: { passengerId: userId },
    }),
    prisma.ride.count({
      where: {
        passengerId: userId,
        rideStatus: 'completed',
      },
    }),
    prisma.ride.count({
      where: {
        passengerId: userId,
        rideStatus: 'cancelled',
      },
    }),
    prisma.ride.aggregate({
      where: {
        passengerId: userId,
        rideStatus: 'completed',
      },
      _sum: {
        totalFare: true,
      },
    }),
    prisma.userSavedLocation.count({
      where: { user_id: userId },
    }),
  ]);

  const stats = {
    totalRides,
    completedRides,
    cancelledRides,
    activeRides: totalRides - completedRides - cancelledRides,
    totalSpent: totalSpent._sum.totalFare || 0,
    savedLocations: savedLocationsCount,
  };

  sendSuccess(res, stats);
});

/**
 * Get user's ride history
 * GET /users/:id/rides
 * @access Private
 */
exports.getUserRides = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  // Check if user is accessing their own rides
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const skip = (page - 1) * limit;
  const where = { passengerId: BigInt(id) };

  if (status) {
    where.rideStatus = status;
  }

  const [rides, total] = await Promise.all([
    prisma.ride.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        driver: {
          select: {
            id: true,
            user: {
              select: {
                full_name: true,
                phone_number: true,
                profile_photo_url: true,
              },
            },
            ratingAverage: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            vehicle_type: true,
            vehicle_category: true,
            manufacturer: true,
            model: true,
            number_plate: true,
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
 * Change user type (passenger/driver/both)
 * PUT /users/:id/user-type
 * @access Private
 */
exports.changeUserType = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userType } = req.body;

  // Check if user is updating their own account
  if (req.userId.toString() !== id) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Validate user type
  const validUserTypes = ['passenger', 'driver', 'both', 'partner'];
  if (!validUserTypes.includes(userType)) {
    return sendError(res, 'Invalid user type', 400, 'INVALID_USER_TYPE');
  }

  // If changing to driver or both, check if partner profile exists
  if (userType === 'driver' || userType === 'both') {
    const partner = await prisma.partner.findUnique({
      where: { user_id: BigInt(id) },
    });

    if (!partner) {
      return sendError(res, 'Partner profile required to become a driver. Please complete driver registration first.', 400, 'PARTNER_PROFILE_REQUIRED');
    }

    if (partner.verification_status !== 'approved') {
      return sendError(res, 'Partner verification pending. You cannot become a driver yet.', 400, 'VERIFICATION_PENDING');
    }
  }

  // Update user type
  const updatedUser = await prisma.user.update({
    where: { user_id: BigInt(id) },
    data: { user_type: userType },
    select: {
      user_id: true,
      full_name: true,
      phone_number: true,
      user_type: true,
    },
  });

  sendSuccess(res, updatedUser, 'User type updated successfully');
});

exports.completeProfileOnboarding = catchAsync(async (req, res) => {
  const { id } = req.params;
console.log(id);

  // 1. Safety Check: Verify the user is modifying their own account session
  // if (req.userId.toString() !== id) {
  //   return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  // }

  // 2. Execute a lightweight update statement directly
  try {
    const updatedUser = await prisma.user.update({
      where: { user_id: BigInt(id) },
      data: {
        profile_filled: true, // Mark status boolean as active
      },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        profile_filled: true,
        phone_number: true,
        profile_photo_url: true,
        user_type: true,
        is_verified: true,
         // Return to update your frontend app state context
      },
    });

    // 3. Prevent BigInt JSON serialization error
    const sanitizedUser = {
      ...updatedUser,
      user_id: updatedUser.user_id.toString(),
    };
    return sendSuccess(res, sanitizedUser, 'Profile onboarding completed successfully.');
  } catch (error) {
    // Catch Prisma target errors (P2025 is Record to update not found)
    if (error.code === 'P2025') {
      return sendNotFound(res, 'User profile records do not exist.');
    }
   console.log(error);
   
  }
});

// module.exports = {
//   getUserById,
//   getAllUsers, X
//   updateUser,
//   updateProfilePhoto,
//   deleteUser,
//   getSavedLocations, X
//   addSavedLocation,X
//   updateSavedLocation,X
//   deleteSavedLocation,X
//   getUserStats,
//   getUserRides,
//   changeUserType,
// };
