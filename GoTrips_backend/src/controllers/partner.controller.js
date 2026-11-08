const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Register as partner (driver/vehicle owner)
 * POST /api/partners/register
 * @access Private (authenticated user)
 */
exports.registerPartner = catchAsync(async (req, res) => {
  console.log(req.body);
  const {
    partnerType,
    businessName,
    // bankAccountNumber,
    // bankIfscCode,
    // bankAccountHolder,
    // upiId,
  } = req.body;

  // Check if user already has a partner profile
  const existingPartner = await prisma.partner.findUnique({
    where: { user_id: req.userId },
  });

  if (existingPartner) {
    return sendError(res, 'Partner profile already exists', 409, 'PARTNER_EXISTS');
  }

  // Validate partner type
  const validPartnerTypes = ['vehicle_service', 'vehicle_driver', 'vehicle_rental'];
  if (!validPartnerTypes.includes(partnerType)) {
    return sendError(res, 'Invalid partner type', 400, 'INVALID_PARTNER_TYPE');
  }

  // Create partner profile
  const partner = await prisma.partner.create({
    data: {
      user_id: req.userId,
      partner_type: partnerType,
      business_name: businessName,
      // bankAccountNumber,
      // bankIfscCode,
      // bankAccountHolder,
      // upiId,
      verification_status: 'pending',
    },
    include: {
      user: {
        select: {
          user_id: true,
          full_name: true,
          phone_number: true,
          email: true,
        },
      },
    },
  });
  const updatedUser = await prisma.user.update({
    where: { user_id: BigInt(req.userId) },
    data: { user_type: userType },
  });

  sendCreated(res, partner, 'Partner registration successful. Verification pending.');
});

/**
 * Get partner profile
 * GET /api/partners/:id
 * @access Private (own profile or admin)
 */
exports.getPartnerById = catchAsync(async (req, res) => {
  const { id } = req.params;
  console.log('Fetching partner profile for ID:', id);
  const partner = await prisma.partner.findUnique({
    where: { partner_id: id },
    include: {
      user: {
        select: {
          user_id: true,
          full_name: true,
          phone_number: true,
          email: true,
          profile_photo_url: true,
          profile_filled: true,
        },
      },
    },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  sendSuccess(res, partner);
});

/**
 * Get partner profile by user ID
 * GET /api/partners/user/:userId
 * @access Private
 */
exports.getPartnerByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;

  // Check authorization
  if (userId !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const partner = await prisma.partner.findUnique({
    where: { user_id: BigInt(userId) },
    include: {
      user: {
        select: {
          user_id: true,
          full_name: true,
          phone_number: true,
          email: true,
          profile_photo_url: true,
        },
      },
    },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner profile');
  }

  sendSuccess(res, partner);
});

/**
 * Get all partners (Admin only)
 * GET /api/partners
 * @access Private (Admin)
 */
exports.getAllPartners = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', partnerType, verificationStatus, isOnline, search } = req.query;

  const skip = (page - 1) * limit;
  const where = {};

  if (partnerType) {
    where.partnerType = partnerType;
  }

  if (verificationStatus) {
    where.verificationStatus = verificationStatus;
  }

  if (isOnline !== undefined) {
    where.isOnline = isOnline === 'true';
  }

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { phoneNumber: { contains: search } } },
    ];
  }

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
    }),
    prisma.partner.count({ where }),
  ]);

  sendPaginated(res, partners, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Update partner profile
 * PUT /api/partners/:id
 * @access Private (own profile)
 */
exports.updatePartner = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { businessName, bankAccountNumber, bankIfscCode, bankAccountHolder, upiId, languagePreference } = req.body;

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Update partner
  const updatedPartner = await prisma.partner.update({
    where: { id: BigInt(id) },
    data: {
      ...(businessName && { businessName }),
      ...(bankAccountNumber && { bankAccountNumber }),
      ...(bankIfscCode && { bankIfscCode }),
      ...(bankAccountHolder && { bankAccountHolder }),
      ...(upiId && { upiId }),
      ...(languagePreference && { languagePreference }),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
        },
      },
    },
  });

  sendSuccess(res, updatedPartner, 'Partner profile updated successfully');
});

/**
 * Upload partner documents
 * POST /api/partners/:id/documents
 * @access Private
 */
exports.uploadDocuments = catchAsync(async (req, res) => {
  const { id } = req.params;

console.log('file',req.file);
console.log('files',req.files);

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { partner_id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  if (!req.files || Object.keys(req.files).length === 0) {
    return sendError(res, 'No files uploaded', 400, 'FILES_REQUIRED');
  }

  const uploadedDocuments = [];

  // Process each document type
  for (const [documentType, files] of Object.entries(req.files)) {
    for (const file of files) {
      const document = await prisma.partnerDocument.create({
        data: {
          partner_id: BigInt(id),
          document_type: documentType,
          document_url: file.url,
          verification_status: 'pending',
        },
      });
      uploadedDocuments.push(document);
    }
  }

  sendCreated(res, uploadedDocuments, 'Documents uploaded successfully. Verification pending.');
});

/**
 * Get partner documents
 * GET /api/partners/:id/documents
 * @access Private
 */
exports.getDocuments = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { partner_id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const documents = await prisma.partnerDocument.findMany({
    where: { partner_id: BigInt(id) },
    orderBy: { uploaded_at: 'desc' },
  });

  sendSuccess(res, documents);
});

/**
 * Toggle partner online status
 * PUT /api/partners/:id/online-status
 * @access Private
 */
exports.toggleOnlineStatus = catchAsync(async (req, res) => {
  const id = req.params.id;
  const { isOnline } = req.body;

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { partner_id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Check if partner is verified
  if (partner.verification_status !== 'approved') {
    return sendError(res, 'Cannot go online. Partner verification pending or rejected.', 403, 'VERIFICATION_REQUIRED');
  }

  // Update online status
  const updatedPartner = await prisma.partner.update({
    where: { partner_id: BigInt(id) },
    data: { is_online: isOnline !== undefined ? isOnline : !partner.is_online },
    select: {
      user_id: true,
      is_online: true,
      user: {
        select: {
          full_name: true,
        },
      },
    },
  });

  sendSuccess(res, updatedPartner, updatedPartner.is_online ? 'You are now online' : 'You are now offline');
});

/**
 * Get partner earnings
 * GET /api/partners/:id/earnings
 * @access Private
 */
exports.getEarnings = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, page = 1, limit = 20, payoutStatus } = req.query;

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const skip = (page - 1) * limit;
  const where = { partnerId: BigInt(id) };

  if (payoutStatus) {
    where.payoutStatus = payoutStatus;
  }

  if (startDate || endDate) {
    where.earnedAt = {};
    if (startDate) where.earnedAt.gte = new Date(startDate);
    if (endDate) where.earnedAt.lte = new Date(endDate);
  }

  const [earnings, total, summary] = await Promise.all([
    prisma.partnerEarning.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { earnedAt: 'desc' },
      include: {
        ride: {
          select: {
            id: true,
            pickupAddress: true,
            dropAddress: true,
            totalFare: true,
            rideStatus: true,
          },
        },
        rentalBooking: {
          select: {
            id: true,
            totalAmount: true,
            bookingStatus: true,
          },
        },
      },
    }),
    prisma.partnerEarning.count({ where }),
    prisma.partnerEarning.aggregate({
      where: { partnerId: BigInt(id) },
      _sum: {
        grossAmount: true,
        commissionAmount: true,
        netEarnings: true,
      },
      _count: true,
    }),
  ]);

  sendPaginated(
    res,
    {
      earnings,
      summary: {
        totalEarnings: summary._sum.grossAmount || 0,
        totalCommission: summary._sum.commissionAmount || 0,
        netEarnings: summary._sum.netEarnings || 0,
        totalTransactions: summary._count,
        pendingPayout: partner.pendingPayout,
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
 * Get partner statistics
 * GET /api/partners/:id/stats
 * @access Private
 */
exports.getPartnerStats = catchAsync(async (req, res) => {
  const id = req.params.id;

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { partner_id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const partnerId = BigInt(id);

  // Fetch statistics
  const [totalRides, completedRides, cancelledRides, totalVehicles, activeVehicles, totalEarnings, pendingEarnings] = await Promise.all([
    prisma.ride.count({
      where: { driver_id: partnerId },
    }),
    prisma.ride.count({
      where: {
        driver_id: partnerId,
        ride_status: 'completed',
      },
    }),
    prisma.ride.count({
      where: {
        driver_id: partnerId,
        ride_status: 'cancelled',
      },
    }),
    prisma.vehicle.count({
      where: { partner_id: partnerId },
    }),
    prisma.vehicle.count({
      where: {
        partner_id: partnerId,
        is_available: true,
      },
    }),
    prisma.partnerEarning.aggregate({
      where: {
        partner_id: partnerId,
        payout_status: 'completed',
      },
      _sum: {
        net_earnings: true,
      },
    }),
    prisma.partnerEarning.aggregate({
      where: {
        partner_id: partnerId,
        payout_status: 'pending',
      },
      _sum: {
        net_earnings: true,
      },
    }),
  ]);

  const stats = {
    rides: {
      total: totalRides,
      completed: completedRides,
      cancelled: cancelledRides,
      active: totalRides - completedRides - cancelledRides,
    },
    vehicles: {
      total: totalVehicles,
      active: activeVehicles,
      inactive: totalVehicles - activeVehicles,
    },
    earnings: {
      total: totalEarnings._sum.net_earnings || 0,
      pending: pendingEarnings._sum.net_earnings || 0,
      rating: partner.rating_average,
    },
    profile: {
      verificationStatus: partner.verification_status,
      isOnline: partner.is_online,
      partnerType: partner.partner_type,
    },
  };

  sendSuccess(res, stats);
});

/**
 * Get partner's rides
 * GET /api/partners/:id/rides
 * @access Private
 */
exports.getPartnerRides = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, status, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { partner_id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.user_id.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const skip = (page - 1) * limit;
  const where = { driver_id: BigInt(id) };

  if (status) {
    where.ride_status = status;
  }

  const [rides, total] = await Promise.all([
    prisma.ride.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        passenger: {
          select: {
            user_id: true,
            full_name: true,
            phone_number: true,
            profile_photo_url: true,
          },
        },
        vehicle: {
          select: {
            vehicle_id: true,
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
 * Request payout
 * POST /api/partners/:id/payout-request
 * @access Private
 */
exports.requestPayout = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { id: BigInt(id) },
  });

  if (!partner) {
    return sendNotFound(res, 'Partner');
  }

  // Check authorization
  if (partner.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Validate amount
  const requestAmount = parseFloat(amount);
  if (requestAmount <= 0) {
    return sendError(res, 'Invalid payout amount', 400, 'INVALID_AMOUNT');
  }

  if (requestAmount > partner.pendingPayout) {
    return sendError(res, `Insufficient balance. Available: ₹${partner.pendingPayout}`, 400, 'INSUFFICIENT_BALANCE');
  }

  // Minimum payout amount check (₹100)
  const minimumPayout = 100;
  if (requestAmount < minimumPayout) {
    return sendError(res, `Minimum payout amount is ₹${minimumPayout}`, 400, 'BELOW_MINIMUM');
  }

  // Check bank details
  if (!partner.bankAccountNumber || !partner.bankIfscCode) {
    return sendError(res, 'Bank account details required. Please update your profile.', 400, 'BANK_DETAILS_REQUIRED');
  }

  // Create payout request
  // Note: In production, you'd integrate with payment gateway here
  const payoutRequest = {
    partnerId: id,
    amount: requestAmount,
    bankAccount: partner.bankAccountNumber,
    ifscCode: partner.bankIfscCode,
    accountHolder: partner.bankAccountHolder,
    status: 'pending',
    requestedAt: new Date(),
  };

  sendSuccess(res, payoutRequest, 'Payout request submitted. Processing time: 2-3 business days.');
});

// module.exports = {
//   registerPartner,
//   getPartnerById,
//   getPartnerByUserId,
//   getAllPartners,
//   updatePartner,
//   uploadDocuments,
//   getDocuments,
//   toggleOnlineStatus,
//   getEarnings,
//   getPartnerStats,
//   getPartnerRides,
//   requestPayout,
// };
