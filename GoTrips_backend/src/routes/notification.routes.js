const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const sendNotificationSchema = Joi.object({
  userId: Joi.string().pattern(/^\d+$/).required(),
  notificationType: Joi.string()
    .valid('ride_request', 'ride_accepted', 'ride_started', 'ride_completed', 'payment', 'promotion', 'system', 'driver_contact_purchased', 'new_lead', 'lead_status_changed')
    .default('system'),
  title: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(500).required(),
  data: Joi.object().optional(),
});

const notificationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isRead: Joi.string().valid('true', 'false').optional(),
  notificationType: Joi.string().valid('ride_request', 'ride_accepted', 'ride_started', 'ride_completed', 'payment', 'promotion', 'system').optional(),
});

const registerDeviceSchema = Joi.object({
  deviceToken: Joi.string().required().messages({
    'string.empty': 'Device token is required',
  }),
  deviceType: Joi.string().valid('android', 'ios').required().messages({
    'any.only': 'Device type must be either android or ios',
  }),
});

const unregisterDeviceSchema = Joi.object({
  deviceToken: Joi.string().required(),
});

const updateSettingsSchema = Joi.object({
  rideUpdates: Joi.boolean().optional(),
  paymentUpdates: Joi.boolean().optional(),
  promotions: Joi.boolean().optional(),
  systemUpdates: Joi.boolean().optional(),
  marketplaceLeads: Joi.boolean().optional(),
}).min(1);

const sendBulkSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().pattern(/^\d+$/)).optional(),
  userType: Joi.string().valid('passenger', 'driver', 'both').optional(),
  notificationType: Joi.string().valid('ride_request', 'ride_accepted', 'ride_started', 'ride_completed', 'payment', 'promotion', 'system').default('system'),
  title: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(500).required(),
  data: Joi.object().optional(),
}).or('userIds', 'userType');

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   POST /api/notifications/send
 * @desc    Send notification to user (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/send',
  authenticate,
  // Add admin check middleware here
  validateBody(sendNotificationSchema),
  notificationController.sendNotification
);

/**
 * @route   POST /api/notifications/send-bulk
 * @desc    Send bulk notifications (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/send-bulk',
  authenticate,
  // Add admin check middleware here
  validateBody(sendBulkSchema),
  notificationController.sendBulkNotifications
);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', authenticate, validateQuery(notificationsQuerySchema), notificationController.getMyNotifications);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticate, validateParams(idParamSchema), notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticate, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticate, validateParams(idParamSchema), notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications
 * @access  Private
 */
router.delete('/', authenticate, notificationController.deleteAllNotifications);

/**
 * @route   POST /api/notifications/register-device
 * @desc    Register device for push notifications
 * @access  Private
 */
router.post('/register-device', authenticate, generalLimiter, validateBody(registerDeviceSchema), notificationController.registerDevice);

/**
 * @route   DELETE /api/notifications/unregister-device
 * @desc    Unregister device
 * @access  Private
 */
router.delete('/unregister-device', authenticate, validateBody(unregisterDeviceSchema), notificationController.unregisterDevice);

/**
 * @route   GET /api/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/settings', authenticate, notificationController.getNotificationSettings);

/**
 * @route   PUT /api/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/settings', authenticate, validateBody(updateSettingsSchema), notificationController.updateNotificationSettings);

/**
 * @route   POST /api/notifications/test
 * @desc    Test notification (Development only)
 * @access  Private
 */
router.post('/test', authenticate, notificationController.testNotification);

module.exports = router;
