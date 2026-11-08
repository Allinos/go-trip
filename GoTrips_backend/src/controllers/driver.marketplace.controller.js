const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');
const { calculateDistance } = require('../utils/helpers');
const { maskPhoneNumber, maskEmail } = require('../utils/encryption.utils');

/**
 * Register driver in marketplace (₹49 payment)
 * POST /api/marketplace/register-driver
 * @access Private (Partner only)
 */
exports.registerDriver = catchAsync(async (req, res) => {
  const {
    serviceCity,
    homeLocationLat,
    homeLocationLng,
    marketplaceBio,
    specializations,
    languagesSpoken,
    yearsOfExperience,
    primaryVehicleType,
    ownVehicle,
    expectedSalaryMin,
    expectedSalaryMax,
    preferredJobType,
  } = req.body;

  // Get partner
  const partner = await prisma.partner.findUnique({
    where: { userId: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found. Please complete partner registration first.', 404, 'PARTNER_NOT_FOUND');
  }

  // Check if already registered in marketplace
  const existingProfile = await prisma.driverMarketplaceProfile.findUnique({
    where: { partnerId: partner.id },
  });

  if (existingProfile && existingProfile.marketplaceStatus === 'active') {
    return sendError(res, 'Already registered in marketplace', 409, 'ALREADY_REGISTERED');
  }

  // Validation
  if (!serviceCity || !marketplaceBio) {
    return sendError(res, 'Service city and bio are required', 400, 'VALIDATION_ERROR');
  }

  // TODO: Create Razorpay/Stripe payment order for ₹49
  const paymentOrder = {
    orderId: `marketplace_reg_${Date.now()}`,
    amount: 4900, // ₹49 in paise
    currency: 'INR',
    description: 'Driver Marketplace Registration',
  };

  sendSuccess(res, {
    paymentOrder,
    amount: 49.00,
    profileData: {
      serviceCity,
      marketplaceBio,
      yearsOfExperience,
    },
  }, 'Complete payment to activate marketplace profile');
});

/**
 * Verify registration payment and activate profile
 * POST /api/marketplace/verify-registration
 * @access Private (Partner)
 */
exports.verifyRegistration = catchAsync(async (req, res) => {
  const {
    orderId,
    paymentId,
    signature,
    serviceCity,
    homeLocationLat,
    homeLocationLng,
    marketplaceBio,
    specializations,
    languagesSpoken,
    yearsOfExperience,
    primaryVehicleType,
    ownVehicle,
    expectedSalaryMin,
    expectedSalaryMax,
    preferredJobType,
  } = req.body;

  // Get partner
  const partner = await prisma.partner.findUnique({
    where: { user_id: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found', 404, 'PARTNER_NOT_FOUND');
  }

  // TODO: Verify Razorpay signature
  // For now, assuming payment successful

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      transactionType: 'driver_subscription', // or 'driver_registration'
      payerId: req.userId,
      amount: 49.00,
      paymentMethod: 'upi',
      paymentStatus: 'completed',
      transactionId: paymentId,
      gatewayName: 'razorpay',
    },
  });

  // Create or update marketplace profile
  const profile = await prisma.driverMarketplaceProfile.upsert({
    where: { partnerId: partner.id },
    update: {
      serviceCity,
      homeLocationLat: homeLocationLat ? parseFloat(homeLocationLat) : null,
      homeLocationLng: homeLocationLng ? parseFloat(homeLocationLng) : null,
      marketplaceBio,
      specializations,
      languagesSpoken,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
      primaryVehicleType,
      ownVehicle: ownVehicle || false,
      expectedSalaryMin: expectedSalaryMin ? parseFloat(expectedSalaryMin) : null,
      expectedSalaryMax: expectedSalaryMax ? parseFloat(expectedSalaryMax) : null,
      preferredJobType,
      marketplaceStatus: 'active',
      showInMarketplace: true,
      marketplaceRegisteredAt: new Date(),
      registrationPaymentId: payment.id,
    },
    create: {
      partnerId: partner.id,
      serviceCity,
      homeLocationLat: homeLocationLat ? parseFloat(homeLocationLat) : null,
      homeLocationLng: homeLocationLng ? parseFloat(homeLocationLng) : null,
      marketplaceBio,
      specializations,
      languagesSpoken,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
      primaryVehicleType,
      ownVehicle: ownVehicle || false,
      expectedSalaryMin: expectedSalaryMin ? parseFloat(expectedSalaryMin) : null,
      expectedSalaryMax: expectedSalaryMax ? parseFloat(expectedSalaryMax) : null,
      preferredJobType,
      marketplaceStatus: 'active',
      showInMarketplace: true,
      marketplaceRegisteredAt: new Date(),
      registrationPaymentId: payment.id,
    },
  });

  sendCreated(res, profile, 'Marketplace profile activated successfully!');
});

/**
 * Search drivers in marketplace
 * GET /api/marketplace/search-drivers
 * @access Public
 */
exports.searchDrivers = catchAsync(async (req, res) => {
  const {
    latitude,
    longitude,
    city,
    radiusKm = 50,
    vehicleType,
    minExperience = 0,
    languages,
    specialization,
    page = 1,
    limit = 20,
    sortBy = 'distance',
  } = req.query;

  // Require either coordinates or city
  if (!latitude && !longitude && !city) {
    return sendError(res, 'Location (coordinates or city) is required', 400, 'LOCATION_REQUIRED');
  }

  const skip = (page - 1) * limit;
  const where = {
    marketplaceStatus: 'active',
    showInMarketplace: true,
    partner: {
      verificationStatus: 'approved',
    },
  };

  // Filter by city
  if (city) {
    where.serviceCity = { contains: city, mode: 'insensitive' };
  }

  // Filter by experience
  if (minExperience) {
    where.yearsOfExperience = { gte: parseInt(minExperience) };
  }

  // Filter by vehicle type
  if (vehicleType) {
    where.primaryVehicleType = vehicleType;
  }

  // Get profiles
  let profiles = await prisma.driverMarketplaceProfile.findMany({
    where,
    include: {
      partner: {
        include: {
          user: {
            select: {
              fullName: true,
              phoneNumber: true,
              email: true,
              profilePhotoUrl: true,
            },
          },
          vehicles: {
            where: {
              isAvailable: true,
              isVerified: true,
            },
            take: 2,
          },
        },
      },
    },
  });

  // Calculate distance if coordinates provided
  if (latitude && longitude) {
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    profiles = profiles
      .map((profile) => {
        if (profile.homeLocationLat && profile.homeLocationLng) {
          const distance = calculateDistance(
            userLat,
            userLng,
            parseFloat(profile.homeLocationLat),
            parseFloat(profile.homeLocationLng)
          );

          return {
            ...profile,
            distanceKm: parseFloat(distance.toFixed(2)),
          };
        }
        return { ...profile, distanceKm: null };
      })
      .filter((profile) => !profile.distanceKm || profile.distanceKm <= parseInt(radiusKm));

    // Sort by distance
    if (sortBy === 'distance') {
      profiles.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }
  }

  // Sort by experience
  if (sortBy === 'experience') {
    profiles.sort((a, b) => (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0));
  }

  // Sort by profile completeness
  if (sortBy === 'completeness') {
    profiles.sort((a, b) => (b.profileCompleteness || 0) - (a.profileCompleteness || 0));
  }

  // Pagination
  const total = profiles.length;
  profiles = profiles.slice(skip, skip + parseInt(limit));

  // Check if user has already unlocked each driver
  let userUnlocks = {};
  if (req.userId) {
    const unlocks = await prisma.driverLeadUnlock.findMany({
      where: {
        userId: req.userId,
        partnerId: { in: profiles.map((p) => p.partnerId) },
        paymentStatus: 'completed',
        isExpired: false,
      },
      select: {
        partnerId: true,
      },
    });
    userUnlocks = Object.fromEntries(unlocks.map((u) => [u.partnerId.toString(), true]));
  }

  // Format response with masked contact info
  const formattedProfiles = profiles.map((profile) => {
    const hasUnlocked = userUnlocks[profile.partnerId.toString()];

    return {
      profileId: profile.profileId.toString(),
      partnerId: profile.partnerId.toString(),
      
      // Profile Info
      serviceCity: profile.serviceCity,
      distanceKm: profile.distanceKm,
      marketplaceBio: profile.marketplaceBio,
      yearsOfExperience: profile.yearsOfExperience,
      specializations: profile.specializations,
      languagesSpoken: profile.languagesSpoken,
      primaryVehicleType: profile.primaryVehicleType,
      ownVehicle: profile.ownVehicle,
      profileCompleteness: profile.profileCompleteness,
      verificationBadge: profile.verificationBadge,
      
      // Contact Info (masked unless unlocked)
      fullName: profile.partner.user.fullName,
      profilePhotoUrl: profile.partner.user.profilePhotoUrl,
      phoneNumber: hasUnlocked 
        ? profile.partner.user.phoneNumber 
        : maskPhoneNumber(profile.partner.user.phoneNumber),
      email: hasUnlocked 
        ? profile.partner.user.email 
        : maskEmail(profile.partner.user.email || 'driver@email.com'),
      contactRevealed: hasUnlocked,
      
      // Stats
      ratingAverage: profile.partner.ratingAverage,
      totalRidesCompleted: profile.partner.totalRidesCompleted,
      profileViewCount: profile.profileViewCount,
      totalLeadsReceived: profile.totalLeadsReceived,
      
      // Vehicles
      vehicles: profile.partner.vehicles.map(v => ({
        vehicleType: v.vehicleType,
        vehicleCategory: v.vehicleCategory,
        manufacturer: v.manufacturer,
        model: v.model,
        year: v.year,
      })),
      
      // Unlock Info
      unlockPrice: 49.00,
    };
  });

  sendPaginated(res, formattedProfiles, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Initiate driver unlock payment (User pays ₹49)
 * POST /api/marketplace/unlock-driver/:partnerId
 * @access Private
 */
exports.initiateUnlock = catchAsync(async (req, res) => {
  const { partnerId } = req.params;

  // Get profile
  const profile = await prisma.driverMarketplaceProfile.findUnique({
    where: { partnerId: BigInt(partnerId) },
    include: {
      partner: {
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return sendNotFound(res, 'Driver profile');
  }

  if (profile.marketplaceStatus !== 'active' || !profile.showInMarketplace) {
    return sendError(res, 'Driver not available in marketplace', 400, 'DRIVER_UNAVAILABLE');
  }

  // Check if already unlocked
  const existingUnlock = await prisma.driverLeadUnlock.findFirst({
    where: {
      userId: req.userId,
      partnerId: BigInt(partnerId),
      paymentStatus: 'completed',
      isExpired: false,
    },
  });

  if (existingUnlock) {
    return sendError(res, 'Driver already unlocked. Check "My Unlocked Drivers".', 409, 'ALREADY_UNLOCKED');
  }

  // TODO: Create Razorpay/Stripe order
  const paymentOrder = {
    orderId: `unlock_${Date.now()}`,
    amount: 4900, // ₹49 in paise
    currency: 'INR',
    description: `Unlock driver contact - ${profile.partner.user.fullName}`,
  };

  sendSuccess(res, {
    paymentOrder,
    amount: 49.00,
    driverName: profile.partner.user.fullName,
    driverCity: profile.serviceCity,
  }, 'Complete payment to unlock driver contact details');
});

/**
 * Verify unlock payment and reveal contact (User pays ₹49 - 100% to platform)
 * POST /api/marketplace/verify-unlock/:partnerId
 * @access Private
 */
exports.verifyUnlock = catchAsync(async (req, res) => {
  const { partnerId } = req.params;
  const { orderId, paymentId, signature } = req.body;

  // TODO: Verify Razorpay signature

  // Get profile with full details
  const profile = await prisma.driverMarketplaceProfile.findUnique({
    where: { partnerId: BigInt(partnerId) },
    include: {
      partner: {
        include: {
          user: {
            select: {
              fullName: true,
              phoneNumber: true,
              email: true,
              profilePhotoUrl: true,
            },
          },
          vehicles: {
            where: { isAvailable: true },
          },
        },
      },
    },
  });

  if (!profile) {
    return sendNotFound(res, 'Driver profile');
  }

  // Create payment record (100% to platform, driver gets nothing)
  const payment = await prisma.payment.create({
    data: {
      transactionType: 'driver_unlock',
      payerId: req.userId,
      amount: 49.00,
      paymentMethod: 'upi',
      paymentStatus: 'completed',
      transactionId: paymentId,
      gatewayName: 'razorpay',
    },
  });

  // Create unlock record
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30); // 30 days access

  const unlock = await prisma.driverLeadUnlock.create({
    data: {
      userId: req.userId,
      partnerId: BigInt(partnerId),
      profileId: profile.profileId,
      paymentId: payment.id,
      amountPaid: 49.00,
      paymentStatus: 'completed',
      contactRevealed: true,
      revealedAt: new Date(),
      validUntil,
      leadStatus: 'new',
    },
  });

  // Update profile stats (increment leads count)
  await prisma.driverMarketplaceProfile.update({
    where: { profileId: profile.profileId },
    data: {
      totalLeadsReceived: { increment: 1 },
    },
  });

  // TODO: Send notification to driver about new lead

  // Return full contact details
  sendSuccess(res, {
    unlocked: true,
    validUntil,
    unlockId: unlock.unlockId.toString(),
    driver: {
      profileId: profile.profileId.toString(),
      partnerId: profile.partnerId.toString(),
      fullName: profile.partner.user.fullName,
      phoneNumber: profile.partner.user.phoneNumber, // REVEALED
      email: profile.partner.user.email, // REVEALED
      whatsappNumber: profile.partner.user.phoneNumber, // Same as phone
      profilePhotoUrl: profile.partner.user.profilePhotoUrl,
      
      // Profile details
      serviceCity: profile.serviceCity,
      marketplaceBio: profile.marketplaceBio,
      yearsOfExperience: profile.yearsOfExperience,
      specializations: profile.specializations,
      languagesSpoken: profile.languagesSpoken,
      primaryVehicleType: profile.primaryVehicleType,
      
      // Stats
      ratingAverage: profile.partner.ratingAverage,
      totalRidesCompleted: profile.partner.totalRidesCompleted,
      
      // Vehicles
      vehicles: profile.partner.vehicles,
    },
  }, 'Driver contact unlocked successfully! Valid for 30 days.');
});

/**
 * Get my marketplace profile (Driver)
 * GET /api/marketplace/my-profile
 * @access Private (Partner)
 */
exports.getMyProfile = catchAsync(async (req, res) => {
  const partner = await prisma.partner.findUnique({
    where: { userId: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found', 404, 'PARTNER_NOT_FOUND');
  }

  const profile = await prisma.driverMarketplaceProfile.findUnique({
    where: { partnerId: partner.id },
  });

  if (!profile) {
    return sendError(res, 'Not registered in marketplace', 404, 'NOT_REGISTERED');
  }

  sendSuccess(res, profile);
});

/**
 * Update marketplace profile (Driver)
 * PUT /api/marketplace/my-profile
 * @access Private (Partner)
 */
exports.updateMyProfile = catchAsync(async (req, res) => {
  const {
    marketplaceBio,
    specializations,
    languagesSpoken,
    yearsOfExperience,
    expectedSalaryMin,
    expectedSalaryMax,
    preferredJobType,
    showInMarketplace,
  } = req.body;

  const partner = await prisma.partner.findUnique({
    where: { userId: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found', 404, 'PARTNER_NOT_FOUND');
  }

  const profile = await prisma.driverMarketplaceProfile.update({
    where: { partnerId: partner.id },
    data: {
      ...(marketplaceBio && { marketplaceBio }),
      ...(specializations && { specializations }),
      ...(languagesSpoken && { languagesSpoken }),
      ...(yearsOfExperience && { yearsOfExperience: parseInt(yearsOfExperience) }),
      ...(expectedSalaryMin && { expectedSalaryMin: parseFloat(expectedSalaryMin) }),
      ...(expectedSalaryMax && { expectedSalaryMax: parseFloat(expectedSalaryMax) }),
      ...(preferredJobType && { preferredJobType }),
      ...(showInMarketplace !== undefined && { showInMarketplace }),
    },
  });

  sendSuccess(res, profile, 'Profile updated successfully');
});

/**
 * Get my leads (Driver)
 * GET /api/marketplace/my-leads
 * @access Private (Partner)
 */
exports.getMyLeads = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    leadStatus,
  } = req.query;

  const partner = await prisma.partner.findUnique({
    where: { userId: req.userId },
  });

  if (!partner) {
    return sendError(res, 'Partner profile not found', 404, 'PARTNER_NOT_FOUND');
  }

  const skip = (page - 1) * limit;
  const where = {
    partnerId: partner.id,
    paymentStatus: 'completed',
  };

  if (leadStatus) {
    where.leadStatus = leadStatus;
  }

  const [leads, total] = await Promise.all([
    prisma.driverLeadUnlock.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            fullName: true,
            phoneNumber: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
    }),
    prisma.driverLeadUnlock.count({ where }),
  ]);

  sendPaginated(res, leads, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get user's unlocked drivers
 * GET /api/marketplace/my-unlocked-drivers
 * @access Private
 */
exports.getMyUnlockedDrivers = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    leadStatus,
  } = req.query;

  const skip = (page - 1) * limit;
  const where = {
    userId: req.userId,
    paymentStatus: 'completed',
  };

  if (leadStatus) {
    where.leadStatus = leadStatus;
  }

  const [unlocks, total] = await Promise.all([
    prisma.driverLeadUnlock.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          include: {
            partner: {
              include: {
                user: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                    email: true,
                    profilePhotoUrl: true,
                  },
                },
                vehicles: {
                  where: { isAvailable: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    prisma.driverLeadUnlock.count({ where }),
  ]);

  const formattedUnlocks = unlocks.map((unlock) => ({
    unlockId: unlock.unlockId.toString(),
    partnerId: unlock.partnerId.toString(),
    profileId: unlock.profileId.toString(),
    
    // Driver info
    driver: {
      fullName: unlock.profile.partner.user.fullName,
      phoneNumber: unlock.profile.partner.user.phoneNumber,
      email: unlock.profile.partner.user.email,
      profilePhotoUrl: unlock.profile.partner.user.profilePhotoUrl,
      serviceCity: unlock.profile.serviceCity,
      yearsOfExperience: unlock.profile.yearsOfExperience,
      ratingAverage: unlock.profile.partner.ratingAverage,
      vehicle: unlock.profile.partner.vehicles[0],
    },
    
    // Unlock details
    amountPaid: unlock.amountPaid,
    unlockedAt: unlock.createdAt,
    validUntil: unlock.validUntil,
    isExpired: unlock.isExpired || new Date() > unlock.validUntil,
    leadStatus: unlock.leadStatus,
    hiringStatus: unlock.hiringStatus,
    contactViewedCount: unlock.contactViewedCount,
    leadNotes: unlock.leadNotes,
  }));

  sendPaginated(res, formattedUnlocks, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Update lead status (User)
 * PUT /api/marketplace/my-unlocked-drivers/:unlockId
 * @access Private
 */
exports.updateLeadStatus = catchAsync(async (req, res) => {
  const { unlockId } = req.params;
  const { leadStatus, hiringStatus, notes } = req.body;

  const unlock = await prisma.driverLeadUnlock.findUnique({
    where: { unlockId: BigInt(unlockId) },
  });

  if (!unlock) {
    return sendNotFound(res, 'Unlock record');
  }

  if (unlock.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const updated = await prisma.driverLeadUnlock.update({
    where: { unlockId: BigInt(unlockId) },
    data: {
      ...(leadStatus && { leadStatus }),
      ...(hiringStatus && { hiringStatus }),
      ...(notes && { leadNotes: notes }),
    },
  });

  sendSuccess(res, updated, 'Lead status updated');
});

/**
 * Get marketplace statistics
 * GET /api/marketplace/stats
 * @access Private
 */
exports.getMarketplaceStats = catchAsync(async (req, res) => {
  const userId = req.userId;

  // Check if partner
  const partner = await prisma.partner.findUnique({
    where: { userId },
  });

  if (partner) {
    // Driver stats
    const profile = await prisma.driverMarketplaceProfile.findUnique({
      where: { partnerId: partner.id },
    });

    if (!profile) {
      return sendError(res, 'Not registered in marketplace', 404, 'NOT_REGISTERED');
    }

    const [totalLeads, hiredLeads] = await Promise.all([
      prisma.driverLeadUnlock.count({
        where: {
          partnerId: partner.id,
          paymentStatus: 'completed',
        },
      }),
      prisma.driverLeadUnlock.count({
        where: {
          partnerId: partner.id,
          leadStatus: 'hired',
        },
      }),
    ]);

    return sendSuccess(res, {
      profileViews: profile.profileViewCount,
      totalLeads,
      hiredLeads,
      conversionRate: totalLeads > 0 ? ((hiredLeads / totalLeads) * 100).toFixed(2) : 0,
      profileCompleteness: profile.profileCompleteness,
      marketplaceStatus: profile.marketplaceStatus,
    });
  }

  // User stats
  const [totalUnlocks, hiredDrivers, totalSpent] = await Promise.all([
    prisma.driverLeadUnlock.count({
      where: {
        userId,
        paymentStatus: 'completed',
      },
    }),
    prisma.driverLeadUnlock.count({
      where: {
        userId,
        leadStatus: 'hired',
      },
    }),
    prisma.driverLeadUnlock.aggregate({
      where: {
        userId,
        paymentStatus: 'completed',
      },
      _sum: {
        amountPaid: true,
      },
    }),
  ]);

  sendSuccess(res, {
    totalUnlocks,
    hiredDrivers,
    totalSpent: totalSpent._sum.amountPaid || 0,
  });
});

// module.exports = {
//   registerDriver,
//   verifyRegistration,
//   searchDrivers,
//   initiateUnlock,
//   verifyUnlock,
//   getMyProfile,
//   updateMyProfile,
//   getMyLeads,
//   getMyUnlockedDrivers,
//   updateLeadStatus,
//   getMarketplaceStats,
// };