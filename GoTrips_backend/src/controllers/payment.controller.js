const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');
const crypto = require('crypto');

// TODO: Import payment gateway SDKs
// const Razorpay = require('razorpay');
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

/**
 * Create payment order
 * POST /api/payments/create-order
 * @access Private
 */
exports.createPaymentOrder = catchAsync(async (req, res) => {
  const {
    transactionType,
    rideId,
    rentalBookingId,
    amount,
    description,
  } = req.body;

  // Validation
  if (!transactionType || !amount) {
    return sendError(res, 'Transaction type and amount are required', 400, 'VALIDATION_ERROR');
  }

  if (parseFloat(amount) <= 0) {
    return sendError(res, 'Amount must be greater than 0', 400, 'INVALID_AMOUNT');
  }

  // Validate transaction type
  const validTypes = ['ride', 'rental', 'driver_unlock', 'driver_subscription'];
  if (!validTypes.includes(transactionType)) {
    return sendError(res, 'Invalid transaction type', 400, 'INVALID_TYPE');
  }

  // TODO: Create Razorpay order
  // const order = await razorpay.orders.create({
  //   amount: Math.round(parseFloat(amount) * 100), // Convert to paise
  //   currency: 'INR',
  //   receipt: `receipt_${Date.now()}`,
  //   notes: {
  //     userId: req.userId.toString(),
  //     transactionType,
  //     ...(rideId && { rideId: rideId.toString() }),
  //     ...(rentalBookingId && { rentalBookingId: rentalBookingId.toString() }),
  //   },
  // });

  // Mock payment order for development
  const order = {
    id: `order_${Date.now()}`,
    amount: Math.round(parseFloat(amount) * 100),
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    status: 'created',
  };

  sendCreated(res, {
    orderId: order.id,
    amount: parseFloat(amount),
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
    description: description || `${transactionType} payment`,
  }, 'Payment order created successfully');
});

/**
 * Verify payment
 * POST /api/payments/verify
 * @access Private
 */
exports.verifyPayment = catchAsync(async (req, res) => {
  const {
    orderId,
    paymentId,
    signature,
    transactionType,
    rideId,
    rentalBookingId,
    amount,
    paymentMethod,
    payeeId,
  } = req.body;

  // Validation
  if (!orderId || !paymentId || !signature) {
    return sendError(res, 'Order ID, payment ID, and signature are required', 400, 'VALIDATION_ERROR');
  }

  // TODO: Verify Razorpay signature
  // const generatedSignature = crypto
  //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  //   .update(`${orderId}|${paymentId}`)
  //   .digest('hex');

  // if (generatedSignature !== signature) {
  //   return sendError(res, 'Invalid payment signature', 400, 'INVALID_SIGNATURE');
  // }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      transactionType: transactionType || 'ride',
      rideId: rideId ? BigInt(rideId) : null,
      rentalBookingId: rentalBookingId ? BigInt(rentalBookingId) : null,
      payerId: req.userId,
      payeeId: payeeId ? BigInt(payeeId) : null,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'upi',
      paymentStatus: 'completed',
      transactionId: paymentId,
      gatewayName: 'razorpay',
      gatewayResponse: {
        orderId,
        paymentId,
        signature,
      },
    },
  });

  sendCreated(res, payment, 'Payment verified successfully');
});

/**
 * Get payment by ID
 * GET /api/payments/:id
 * @access Private
 */
exports.getPaymentById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { paymentId: BigInt(id) },
    include: {
      payer: {
        select: {
          fullName: true,
          phoneNumber: true,
          email: true,
        },
      },
      payee: {
        select: {
          fullName: true,
          phoneNumber: true,
          email: true,
        },
      },
      ride: {
        select: {
          rideId: true,
          pickupAddress: true,
          dropAddress: true,
          rideStatus: true,
        },
      },
      rentalBooking: {
        select: {
          bookingId: true,
          startDate: true,
          endDate: true,
          bookingStatus: true,
        },
      },
    },
  });

  if (!payment) {
    return sendNotFound(res, 'Payment');
  }

  // Check authorization
  const isAuthorized =
    payment.payerId.toString() === req.userId.toString() ||
    (payment.payeeId && payment.payeeId.toString() === req.userId.toString());

  if (!isAuthorized) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  sendSuccess(res, payment);
});

/**
 * Get user's payment history
 * GET /api/payments/my-payments
 * @access Private
 */
exports.getMyPayments = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    transactionType,
    paymentStatus,
    startDate,
    endDate,
    sortBy = 'paymentDate',
    sortOrder = 'desc',
  } = req.query;

  const skip = (page - 1) * limit;
  const where = {
    OR: [
      { payerId: req.userId },
      { payeeId: req.userId },
    ],
  };

  if (transactionType) {
    where.transactionType = transactionType;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) where.paymentDate.gte = new Date(startDate);
    if (endDate) where.paymentDate.lte = new Date(endDate);
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        ride: {
          select: {
            rideId: true,
            pickupAddress: true,
            dropAddress: true,
          },
        },
        rentalBooking: {
          select: {
            bookingId: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  sendPaginated(res, payments, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get payment statistics
 * GET /api/payments/stats
 * @access Private
 */
exports.getPaymentStats = catchAsync(async (req, res) => {
  const userId = req.userId;

  const [totalSpent, totalReceived, paymentCount] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        payerId: userId,
        paymentStatus: 'completed',
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.aggregate({
      where: {
        payeeId: userId,
        paymentStatus: 'completed',
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.count({
      where: {
        OR: [
          { payerId: userId },
          { payeeId: userId },
        ],
        paymentStatus: 'completed',
      },
    }),
  ]);

  // Get breakdown by transaction type
  const typeBreakdown = await prisma.payment.groupBy({
    by: ['transactionType'],
    where: {
      payerId: userId,
      paymentStatus: 'completed',
    },
    _sum: {
      amount: true,
    },
    _count: true,
  });

  sendSuccess(res, {
    totalSpent: totalSpent._sum.amount || 0,
    totalReceived: totalReceived._sum.amount || 0,
    totalTransactions: paymentCount,
    breakdown: typeBreakdown.map((item) => ({
      type: item.transactionType,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  });
});

/**
 * Request refund
 * POST /api/payments/:id/refund
 * @access Private
 */
exports.requestRefund = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return sendError(res, 'Refund reason is required', 400, 'REASON_REQUIRED');
  }

  const payment = await prisma.payment.findUnique({
    where: { paymentId: BigInt(id) },
  });

  if (!payment) {
    return sendNotFound(res, 'Payment');
  }

  // Check authorization
  if (payment.payerId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Check if payment can be refunded
  if (payment.paymentStatus !== 'completed') {
    return sendError(res, 'Only completed payments can be refunded', 400, 'CANNOT_REFUND');
  }

  // Check if already refunded
  if (payment.paymentStatus === 'refunded') {
    return sendError(res, 'Payment already refunded', 400, 'ALREADY_REFUNDED');
  }

  // TODO: Process refund with payment gateway
  // const refund = await razorpay.payments.refund(payment.transactionId, {
  //   amount: Math.round(payment.amount * 100),
  //   notes: { reason },
  // });

  // Update payment status
  await prisma.payment.update({
    where: { paymentId: BigInt(id) },
    data: {
      paymentStatus: 'refunded',
    },
  });

  // TODO: Create refund record in payments table
  // const refundRecord = await prisma.payment.create({
  //   data: {
  //     transactionType: 'refund',
  //     payerId: payment.payeeId,
  //     payeeId: payment.payerId,
  //     amount: payment.amount,
  //     paymentMethod: payment.paymentMethod,
  //     paymentStatus: 'completed',
  //     transactionId: refund.id,
  //     gatewayName: 'razorpay',
  //   },
  // });

  sendSuccess(res, null, 'Refund request submitted successfully');
});

/**
 * Get payment methods
 * GET /api/payments/methods
 * @access Private
 */
exports.getPaymentMethods = catchAsync(async (req, res) => {
  const methods = [
    {
      id: 'cash',
      name: 'Cash',
      icon: 'cash',
      enabled: true,
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: 'upi',
      enabled: true,
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: 'card',
      enabled: true,
    },
    {
      id: 'wallet',
      name: 'Wallet',
      icon: 'wallet',
      enabled: true,
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: 'bank',
      enabled: true,
    },
  ];

  sendSuccess(res, methods);
});

/**
 * Webhook for payment gateway
 * POST /api/payments/webhook
 * @access Public (called by payment gateway)
 */
exports.paymentWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body;

  // TODO: Verify webhook signature
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  //   .update(JSON.stringify(body))
  //   .digest('hex');

  // if (expectedSignature !== signature) {
  //   return res.status(400).json({ error: 'Invalid signature' });
  // }

  const event = body.event;
  const paymentData = body.payload.payment.entity;

  // Handle different webhook events
  switch (event) {
    case 'payment.captured':
      // Payment successful
      await prisma.payment.updateMany({
        where: {
          transactionId: paymentData.id,
        },
        data: {
          paymentStatus: 'completed',
        },
      });
      break;

    case 'payment.failed':
      // Payment failed
      await prisma.payment.updateMany({
        where: {
          transactionId: paymentData.id,
        },
        data: {
          paymentStatus: 'failed',
        },
      });
      break;

    case 'refund.processed':
      // Refund processed
      await prisma.payment.updateMany({
        where: {
          transactionId: paymentData.payment_id,
        },
        data: {
          paymentStatus: 'refunded',
        },
      });
      break;

    default:
      console.log('Unhandled webhook event:', event);
  }

  res.status(200).json({ status: 'ok' });
});

/**
 * Generate payment receipt
 * GET /api/payments/:id/receipt
 * @access Private
 */
exports.generateReceipt = catchAsync(async (req, res) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { paymentId: BigInt(id) },
    include: {
      payer: {
        select: {
          fullName: true,
          phoneNumber: true,
          email: true,
        },
      },
      payee: {
        select: {
          fullName: true,
          phoneNumber: true,
        },
      },
      ride: {
        select: {
          pickupAddress: true,
          dropAddress: true,
          distanceKm: true,
        },
      },
    },
  });

  if (!payment) {
    return sendNotFound(res, 'Payment');
  }

  // Check authorization
  if (payment.payerId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Generate receipt data
  const receipt = {
    receiptNumber: `REC-${payment.paymentId}`,
    paymentId: payment.paymentId.toString(),
    date: payment.paymentDate,
    payer: payment.payer,
    payee: payment.payee,
    transactionType: payment.transactionType,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    status: payment.paymentStatus,
    transactionId: payment.transactionId,
    rideDetails: payment.ride,
  };

  sendSuccess(res, receipt);
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentById,
  getMyPayments,
  getPaymentStats,
  requestRefund,
  getPaymentMethods,
  paymentWebhook,
  generateReceipt,
};