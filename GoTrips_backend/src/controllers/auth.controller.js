const prisma = require('../config/database');
const { generateOTP } = require('../utils/encryption.utils');
const { generateTokenPair } = require('../utils/jwt.utils');
const { sendSuccess, sendError } = require('../utils/response.utils');
const { sendOTP } = require('../services/sms.service');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Send OTP for login/signup
 * POST /api/auth/send-otp
 */
exports.sendOTP = catchAsync(async (req, res) => {
  const { phoneNumber, countryCode = '+91', otpType = 'login' } = req.body;

  // Format phone number
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber}`;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { phone_number: formattedPhone },
  });

  // If login attempt but user doesn't exist
  if (otpType === 'login' && !existingUser) {
    return sendError(res, 'User not found. Please sign up first.', 404, 'USER_NOT_FOUND');
  }

  // If signup attempt but user already exists
  if (otpType === 'signup' && existingUser) {
    return sendError(res, 'User already exists. Please login.', 409, 'USER_EXISTS');
  }

  // Generate OTP
  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Save OTP to database
  await prisma.otpVerification.create({
    data: {
      phone_number: formattedPhone,
      otp_code: otp,
      otp_type: otpType,
      expires_at: expiresAt,
      user_id: existingUser?.id || null,
    },
  });

  // Send OTP via SMS
  try {
    await sendOTP(formattedPhone, otp);
  } catch (error) {
    console.error('SMS sending failed:', error);
    // Continue anyway - OTP is saved in DB for testing
  }

  sendSuccess(
    res,
    {
      phone_number: formattedPhone,
      otpSent: true,
      expiresIn: 30000, // seconds
      // Only include OTP in development
      ...(process.env.NODE_ENV === 'development' && { otp }),
    },
    'OTP sent successfully'
  );
});

/**
 * Verify OTP and login/signup
 * POST /api/auth/verify-otp
 */
exports.verifyOTP = catchAsync(async (req, res) => {
  const { phoneNumber, countryCode = '+91', otp, deviceToken, deviceType } = req.body;

  // Format phone number
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber}`;

  // Find valid OTP
  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      phone_number: formattedPhone,
      otp_code: otp,
      is_verified: false,
      expires_at: { gte: new Date() },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!otpRecord) {
    return sendError(res, 'Invalid or expired OTP', 400, 'INVALID_OTP');
  }

  // Mark OTP as verified
  await prisma.otpVerification.update({
    where: { otp_id: otpRecord.otp_id },
    data: { is_verified: true },
  });

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { phone_number: formattedPhone },
  });

  if (!user) {
    // Create new user (signup)
    user = await prisma.user.create({
      data: {
        phone_number: formattedPhone,
        country_code: countryCode,
        is_verified: true,
        terms_accepted: true,
        privacy_accepted: true,
        last_login: new Date(),
      },
    });
  } else {
    // Update existing user (login)
    user = await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        last_login: new Date(),
        is_verified: true,
      },
    });
  }

  // Check if user is active
  if (!user.is_active) {
    return sendError(res, 'Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
  }

  // Generate tokens
  const tokens = generateTokenPair(user);
  // Save device token for push notifications
  if (deviceToken && deviceType) {
    await prisma.pushToken.upsert({
      where: {
        userId_deviceToken: {
          userId: user.id,
          deviceToken,
        },
      },
      create: {
        userId: user.id,
        deviceToken,
        deviceType,
        isActive: true,
      },
      update: {
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  // Return user data and tokens
  
  sendSuccess(
    res,
    {
      user: {
        id: user.user_id,
        phoneNumber: user.phone_number,
        fullName: user.full_name,
        email: user.email,
        profilePhotoUrl: user.profile_photo_url,
        userType: user.user_type,
        isVerified: user.is_verified,
        profileFilled: user.profile_filled,
      },
      ...tokens,
    },
    user.created_at.getTime() === user.updated_at.getTime() ? 'Signup successful' : 'Login successful',
    200
  );
});

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
exports.refreshToken = catchAsync(async (req, res) => {
  const { userId } = req.tokenData; // Set by verifyRefreshToken middleware
  console.log(userId);

  // Get user
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) {
    return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.is_active) {
    return sendError(res, 'Account deactivated', 403, 'ACCOUNT_DEACTIVATED');
  }

  // Generate new tokens
  const tokens = generateTokenPair(user);

  sendSuccess(res, tokens, 'Token refreshed successfully');
});

/**
 * Logout
 * POST /api/auth/logout
 */
exports.logout = catchAsync(async (req, res) => {
  const { userId } = req;
  const { deviceToken } = req.body;

  if (deviceToken) {
    // Deactivate device token
    await prisma.pushToken.updateMany({
      where: {
        userId,
        deviceToken,
      },
      data: {
        isActive: false,
      },
    });
  }

  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
exports.getMe = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { user_id: req.userId },
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
      created_at: true,
      profile_filled: true,
    },
  });

  if (!user) {
    return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
  }

  sendSuccess(res, user);
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
exports.updateProfile = catchAsync(async (req, res) => {
  const { fullName, email, dateOfBirth, gender } = req.body;

  // Check if email is already taken by another user
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { user_id: req.userId },
      },
    });

    if (existingUser) {
      return sendError(res, 'Email already in use', 409, 'EMAIL_EXISTS');
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { user_id: req.userId },
    data: {
      ...{ full_name: fullName },
      ...(email && { email }),
      ...{ date_of_birth: new Date(dateOfBirth) },
      ...(gender && { gender }),
    },
    select: {
      user_id: true,
      phone_number: true,
      full_name: true,
      email: true,
      profile_photo_url: true,
      date_of_birth: true,
      gender: true,
      user_type: true,
    },
  });

  sendSuccess(res, updatedUser, 'Profile updated successfully');
});

/**
 * Update profile photo
 * POST /api/auth/profile-photo
 */
exports.updateProfilePhoto = catchAsync(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400, 'FILE_REQUIRED');
  }

  const photoUrl = req.file.url; // Set by upload middleware

  // Update user profile photo
  const updatedUser = await prisma.user.update({
    where: { user_id: req.userId },
    data: { profile_photo_url: photoUrl },
    select: {
      user_id: true,
      profile_photo_url: true,
    },
  });

  sendSuccess(res, updatedUser, 'Profile photo updated successfully');
});

/**
 * Delete account
 * DELETE /api/auth/account
 */
exports.deleteAccount = catchAsync(async (req, res) => {
  const { confirmPassword } = req.body;

  // For phone-based auth, we can require OTP verification before deletion
  // Or simply allow deletion with confirmation

  // Soft delete by deactivating account
  await prisma.user.update({
    where: { id: req.userId },
    data: {
      isActive: false,
      email: null, // Clear sensitive data
      fullName: null,
    },
  });

  sendSuccess(res, null, 'Account deleted successfully');
});

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
exports.resendOTP = catchAsync(async (req, res) => {
  const { phoneNumber, countryCode = '+91' } = req.body;

  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber}`;

  // Generate new OTP
  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Get user if exists
  const user = await prisma.user.findUnique({
    where: { phone_number: formattedPhone },
  });

  // Save OTP
  await prisma.otpVerification.create({
    data: {
      phone_number: formattedPhone,
      otp_code: otp,
      otp_type: user ? 'login' : 'signup',
      expires_at: expiresAt,
      user_id: user?.id || null,
    },
  });

  // Send OTP
  try {
    await sendOTP(formattedPhone, otp);
  } catch (error) {
    console.error('SMS sending failed:', error);
  }

  sendSuccess(
    res,
    {
      phoneNumber: formattedPhone,
      otpSent: true,
      expiresIn: 300,
      ...(process.env.NODE_ENV === 'development' && { otp }),
    },
    'OTP resent successfully'
  );
});

/**
 * Check if phone number exists
 * POST /api/auth/check-phone
 */
exports.checkPhone = catchAsync(async (req, res) => {
  const { phoneNumber, countryCode = '+91' } = req.body;

  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber}`;

  const user = await prisma.user.findUnique({
    where: { phone_number: formattedPhone },
    select: { user_id: true, phone_number: true, full_name: true },
  });

  sendSuccess(res, {
    exists: !!user,
    phone_number: formattedPhone,
    ...(user && { user_name: user.full_name }),
  });
});
