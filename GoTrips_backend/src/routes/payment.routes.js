const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { paymentLimiter, generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const createOrderSchema = Joi.object({
  transactionType: Joi.string().valid('ride', 'rental', 'driver_unlock', 'driver_subscription').required().messages({
    'any.only': 'Invalid transaction type',
  }),
  rideId: Joi.string().pattern(/^\d+$/).optional(),
  rentalBookingId: Joi.string().pattern(/^\d+$/).optional(),
  amount: Joi.number().min(0.01).required().messages({
    'number.min': 'Amount must be greater than 0',
  }),
  description: Joi.string().max(255).optional(),
});

const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().required().messages({
    'string.empty': 'Order ID is required',
  }),
  paymentId: Joi.string().required().messages({
    'string.empty': 'Payment ID is required',
  }),
  signature: Joi.string().required().messages({
    'string.empty': 'Signature is required',
  }),
  transactionType: Joi.string().valid('ride', 'rental', 'driver_unlock', 'driver_subscription', 'payout', 'refund').required(),
  rideId: Joi.string().pattern(/^\d+$/).optional(),
  rentalBookingId: Joi.string().pattern(/^\d+$/).optional(),
  amount: Joi.number().min(0.01).required(),
  paymentMethod: Joi.string().valid('cash', 'upi', 'wallet', 'card', 'netbanking').default('upi'),
  payeeId: Joi.string().pattern(/^\d+$/).optional(),
});

const paymentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  transactionType: Joi.string().valid('ride', 'rental', 'payout', 'refund', 'driver_unlock', 'driver_subscription').optional(),
  paymentStatus: Joi.string().valid('pending', 'completed', 'failed', 'refunded').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  sortBy: Joi.string().valid('paymentDate', 'amount').default('paymentDate'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const refundRequestSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Reason must be at least 10 characters',
    'string.max': 'Reason cannot exceed 500 characters',
  }),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Invalid payment ID',
  }),
});

// =====================================================
// ROUTES
// =====================================================

/**
 * @route   POST /api/payments/create-order
 * @desc    Create payment order
 * @access  Private
 */
router.post('/create-order', authenticate, paymentLimiter, validateBody(createOrderSchema), paymentController.createPaymentOrder);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment and create record
 * @access  Private
 */
router.post('/verify', authenticate, paymentLimiter, validateBody(verifyPaymentSchema), paymentController.verifyPayment);

/**
 * @route   GET /api/payments/my-payments
 * @desc    Get user's payment history
 * @access  Private
 */
router.get('/my-payments', authenticate, validateQuery(paymentsQuerySchema), paymentController.getMyPayments);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private
 */
router.get('/stats', authenticate, paymentController.getPaymentStats);

/**
 * @route   GET /api/payments/methods
 * @desc    Get available payment methods
 * @access  Private
 */
router.get('/methods', authenticate, paymentController.getPaymentMethods);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment details by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateParams(idParamSchema), paymentController.getPaymentById);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Request refund
 * @access  Private
 */
router.post('/:id/refund', authenticate, validateParams(idParamSchema), validateBody(refundRequestSchema), paymentController.requestRefund);

/**
 * @route   GET /api/payments/:id/receipt
 * @desc    Generate payment receipt
 * @access  Private
 */
router.get('/:id/receipt', authenticate, validateParams(idParamSchema), paymentController.generateReceipt);

/**
 * @route   POST /api/payments/webhook
 * @desc    Payment gateway webhook
 * @access  Public (Called by payment gateway)
 */
router.post('/webhook', paymentController.paymentWebhook);

module.exports = router;
