const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');
const admin = require('../config/firebase'); // Firebase Admin SDK

/**
 * Send notification to user
 * POST /api/notifications/send
 * @access Private (Admin or System)
 */
exports.sendNotification = catchAsync(async (req, res) => {
  const { userId, notificationType, title, message, data } = req.body;

  // Validation
  if (!userId || !title || !message) {
    return sendError(res, 'User ID, title, and message are required', 400, 'VALIDATION_ERROR');
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
  });

  if (!user) {
    return sendNotFound(res, 'User');
  }

  // Create notification in database
  const notification = await prisma.notification.create({
    data: {
      userId: BigInt(userId),
      notificationType: notificationType || 'system',
      title,
      message,
      data: data || null,
    },
  });

  // Get user's FCM tokens
  const tokens = await prisma.pushToken.findMany({
    where: {
      userId: BigInt(userId),
      isActive: true,
    },
    select: {
      deviceToken: true,
    },
  });

  // Send push notification via Firebase
  if (tokens.length > 0) {
    const deviceTokens = tokens.map((t) => t.deviceToken);

    try {
      const fcmMessage = {
        notification: {
          title,
          body: message,
        },
        data: {
          notificationId: notification.notificationId.toString(),
          type: notificationType || 'system',
          ...(data && typeof data === 'object' ? data : {}),
        },
        tokens: deviceTokens,
      };

      const response = await admin.messaging().sendMulticast(fcmMessage);

      // Log failed tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(deviceTokens[idx]);
          }
        });

        // Deactivate failed tokens
        if (failedTokens.length > 0) {
          await prisma.pushToken.updateMany({
            where: {
              deviceToken: { in: failedTokens },
            },
            data: {
              isActive: false,
            },
          });
        }
      }

      sendCreated(
        res,
        {
          notification,
          pushSent: true,
          successCount: response.successCount,
          failureCount: response.failureCount,
        },
        'Notification sent successfully'
      );
    } catch (error) {
      // Notification saved in DB but push failed
      sendCreated(
        res,
        {
          notification,
          pushSent: false,
          error: error.message,
        },
        'Notification saved but push notification failed'
      );
    }
  } else {
    sendCreated(
      res,
      {
        notification,
        pushSent: false,
      },
      'Notification saved but no active devices found'
    );
  }
});

/**
 * Get user notifications
 * GET /api/notifications
 * @access Private
 */
exports.getMyNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, isRead, notificationType } = req.query;

  const skip = (page - 1) * limit;
  const where = { userId: req.userId };

  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }

  if (notificationType) {
    where.notificationType = notificationType;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { sentAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId: req.userId,
        isRead: false,
      },
    }),
  ]);

  sendPaginated(
    res,
    {
      notifications,
      unreadCount,
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
 * Mark notification as read
 * PUT /api/notifications/:id/read
 * @access Private
 */
exports.markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { notificationId: BigInt(id) },
  });

  if (!notification) {
    return sendNotFound(res, 'Notification');
  }

  if (notification.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  const updated = await prisma.notification.update({
    where: { notificationId: BigInt(id) },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  sendSuccess(res, updated, 'Notification marked as read');
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 * @access Private
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId: req.userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  sendSuccess(res, { count: result.count }, `${result.count} notifications marked as read`);
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = catchAsync(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { notificationId: BigInt(id) },
  });

  if (!notification) {
    return sendNotFound(res, 'Notification');
  }

  if (notification.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  await prisma.notification.delete({
    where: { notificationId: BigInt(id) },
  });

  sendSuccess(res, null, 'Notification deleted');
});

/**
 * Delete all notifications
 * DELETE /api/notifications
 * @access Private
 */
exports.deleteAllNotifications = catchAsync(async (req, res) => {
  const result = await prisma.notification.deleteMany({
    where: { userId: req.userId },
  });

  sendSuccess(res, { count: result.count }, `${result.count} notifications deleted`);
});

/**
 * Register device token for push notifications
 * POST /api/notifications/register-device
 * @access Private
 */
exports.registerDevice = catchAsync(async (req, res) => {
  const { deviceToken, deviceType } = req.body;

  if (!deviceToken || !deviceType) {
    return sendError(res, 'Device token and type are required', 400, 'VALIDATION_ERROR');
  }

  // Check if token already exists
  const existingToken = await prisma.pushToken.findFirst({
    where: {
      userId: req.userId,
      deviceToken,
    },
  });

  if (existingToken) {
    // Update existing token
    const updated = await prisma.pushToken.update({
      where: { tokenId: existingToken.tokenId },
      data: {
        isActive: true,
        deviceType,
      },
    });

    return sendSuccess(res, updated, 'Device token updated');
  }

  // Create new token
  const token = await prisma.pushToken.create({
    data: {
      userId: req.userId,
      deviceToken,
      deviceType,
      isActive: true,
    },
  });

  sendCreated(res, token, 'Device registered for push notifications');
});

/**
 * Unregister device token
 * DELETE /api/notifications/unregister-device
 * @access Private
 */
exports.unregisterDevice = catchAsync(async (req, res) => {
  const { deviceToken } = req.body;

  if (!deviceToken) {
    return sendError(res, 'Device token is required', 400, 'VALIDATION_ERROR');
  }

  const result = await prisma.pushToken.updateMany({
    where: {
      userId: req.userId,
      deviceToken,
    },
    data: {
      isActive: false,
    },
  });

  sendSuccess(res, { count: result.count }, 'Device unregistered');
});

/**
 * Get notification settings
 * GET /api/notifications/settings
 * @access Private
 */
exports.getNotificationSettings = catchAsync(async (req, res) => {
  // For now, return default settings
  // You can create a notification_settings table later
  const settings = {
    rideUpdates: true,
    paymentUpdates: true,
    promotions: true,
    systemUpdates: true,
    marketplaceLeads: true,
  };

  sendSuccess(res, settings);
});

/**
 * Update notification settings
 * PUT /api/notifications/settings
 * @access Private
 */
exports.updateNotificationSettings = catchAsync(async (req, res) => {
  const { rideUpdates, paymentUpdates, promotions, systemUpdates, marketplaceLeads } = req.body;

  // For now, just return the settings
  // You can implement a notification_settings table later
  const settings = {
    rideUpdates: rideUpdates !== undefined ? rideUpdates : true,
    paymentUpdates: paymentUpdates !== undefined ? paymentUpdates : true,
    promotions: promotions !== undefined ? promotions : true,
    systemUpdates: systemUpdates !== undefined ? systemUpdates : true,
    marketplaceLeads: marketplaceLeads !== undefined ? marketplaceLeads : true,
  };

  sendSuccess(res, settings, 'Notification settings updated');
});

/**
 * Send bulk notifications (Admin only)
 * POST /api/notifications/send-bulk
 * @access Private (Admin)
 */
exports.sendBulkNotifications = catchAsync(async (req, res) => {
  const { userIds, userType, notificationType, title, message, data } = req.body;

  if (!title || !message) {
    return sendError(res, 'Title and message are required', 400, 'VALIDATION_ERROR');
  }

  let targetUsers = [];

  // Get users based on criteria
  if (userIds && userIds.length > 0) {
    targetUsers = userIds.map((id) => BigInt(id));
  } else if (userType) {
    const users = await prisma.user.findMany({
      where: {
        userType,
        isActive: true,
      },
      select: { id: true },
    });
    targetUsers = users.map((u) => u.id);
  } else {
    return sendError(res, 'Either userIds or userType is required', 400, 'VALIDATION_ERROR');
  }

  if (targetUsers.length === 0) {
    return sendError(res, 'No users found', 404, 'NO_USERS');
  }

  // Create notifications in bulk
  const notifications = await prisma.notification.createMany({
    data: targetUsers.map((userId) => ({
      userId,
      notificationType: notificationType || 'system',
      title,
      message,
      data: data || null,
    })),
  });

  // Get FCM tokens for all users
  const tokens = await prisma.pushToken.findMany({
    where: {
      userId: { in: targetUsers },
      isActive: true,
    },
    select: {
      deviceToken: true,
    },
  });

  let pushResult = null;

  if (tokens.length > 0) {
    try {
      const deviceTokens = tokens.map((t) => t.deviceToken);

      // Firebase has a limit of 500 tokens per request
      const chunks = [];
      for (let i = 0; i < deviceTokens.length; i += 500) {
        chunks.push(deviceTokens.slice(i, i + 500));
      }

      let totalSuccess = 0;
      let totalFailure = 0;

      for (const chunk of chunks) {
        const fcmMessage = {
          notification: { title, body: message },
          data: {
            type: notificationType || 'system',
            ...(data && typeof data === 'object' ? data : {}),
          },
          tokens: chunk,
        };

        const response = await admin.messaging().sendMulticast(fcmMessage);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;
      }

      pushResult = {
        sent: true,
        successCount: totalSuccess,
        failureCount: totalFailure,
      };
    } catch (error) {
      pushResult = {
        sent: false,
        error: error.message,
      };
    }
  }

  sendCreated(
    res,
    {
      notificationsCreated: notifications.count,
      targetUsers: targetUsers.length,
      pushResult,
    },
    'Bulk notifications sent'
  );
});

/**
 * Test notification (Development only)
 * POST /api/notifications/test
 * @access Private
 */
exports.testNotification = catchAsync(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'Test endpoint not available in production', 403, 'NOT_ALLOWED');
  }

  const notification = await prisma.notification.create({
    data: {
      userId: req.userId,
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification from RideFlow',
      data: { test: true },
    },
  });

  sendCreated(res, notification, 'Test notification created');
});

// module.exports = {
//   sendNotification,
//   getMyNotifications,
//   markAsRead,
//   markAllAsRead,
//   deleteNotification,
//   deleteAllNotifications,
//   registerDevice,
//   unregisterDevice,
//   getNotificationSettings,
//   updateNotificationSettings,
//   sendBulkNotifications,
//   testNotification,
// };
