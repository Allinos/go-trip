const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Create support ticket
 * POST /api/support
 * @access Private
 */
exports.createTicket = catchAsync(async (req, res) => {
  const { ticketType, priority, subject, description, rideId, rentalBookingId } = req.body;

  // Validation
  if (!ticketType || !subject || !description) {
    return sendError(res, 'Ticket type, subject, and description are required', 400, 'VALIDATION_ERROR');
  }

  // Validate ride/booking if provided
  if (rideId) {
    const ride = await prisma.ride.findUnique({
      where: { rideId: BigInt(rideId) },
    });

    if (!ride) {
      return sendNotFound(res, 'Ride');
    }

    // Check if user is associated with the ride
    const isPassenger = ride.passengerId.toString() === req.userId.toString();

    let isDriver = false;
    if (ride.driverId) {
      const partner = await prisma.partner.findUnique({
        where: { partnerId: ride.driverId },
      });
      isDriver = partner && partner.userId.toString() === req.userId.toString();
    }

    if (!isPassenger && !isDriver) {
      return sendError(res, 'You are not associated with this ride', 403, 'FORBIDDEN');
    }
  }

  if (rentalBookingId) {
    const booking = await prisma.rentalBooking.findUnique({
      where: { bookingId: BigInt(rentalBookingId) },
    });

    if (!booking) {
      return sendNotFound(res, 'Booking');
    }

    // Check if user is associated with the booking
    const isPassenger = booking.passengerId.toString() === req.userId.toString();

    let isOwner = false;
    if (booking.ownerId) {
      const partner = await prisma.partner.findUnique({
        where: { partnerId: booking.ownerId },
      });
      isOwner = partner && partner.userId.toString() === req.userId.toString();
    }

    if (!isPassenger && !isOwner) {
      return sendError(res, 'You are not associated with this booking', 403, 'FORBIDDEN');
    }
  }

  // Create ticket
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.userId,
      ticketType,
      priority: priority || 'medium',
      subject,
      description,
      rideId: rideId ? BigInt(rideId) : null,
      rentalBookingId: rentalBookingId ? BigInt(rentalBookingId) : null,
      status: 'open',
    },
  });

  // TODO: Send notification to support team
  // TODO: Send confirmation email to user

  sendCreated(res, ticket, 'Support ticket created successfully. Our team will contact you soon.');
});

/**
 * Get my tickets
 * GET /api/support/my-tickets
 * @access Private
 */
exports.getMyTickets = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, ticketType, priority } = req.query;

  const skip = (page - 1) * limit;
  const where = { userId: req.userId };

  if (status) {
    where.status = status;
  }

  if (ticketType) {
    where.ticketType = ticketType;
  }

  if (priority) {
    where.priority = priority;
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
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
    }),
    prisma.supportTicket.count({ where }),
  ]);

  sendPaginated(res, tickets, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Get ticket by ID
 * GET /api/support/:id
 * @access Private
 */
exports.getTicketById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { ticketId: BigInt(id) },
    include: {
      user: {
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
          totalFare: true,
        },
      },
      rentalBooking: {
        select: {
          bookingId: true,
          startDate: true,
          endDate: true,
          bookingStatus: true,
          totalAmount: true,
        },
      },
    },
  });

  if (!ticket) {
    return sendNotFound(res, 'Ticket');
  }

  // Check authorization
  if (ticket.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  sendSuccess(res, ticket);
});

/**
 * Update ticket (Add message/update status)
 * PUT /api/support/:id
 * @access Private
 */
exports.updateTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { message, status } = req.body;

  const ticket = await prisma.supportTicket.findUnique({
    where: { ticketId: BigInt(id) },
  });

  if (!ticket) {
    return sendNotFound(res, 'Ticket');
  }

  // Check authorization
  if (ticket.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  // Users can only close their own tickets
  if (status && status !== 'closed') {
    return sendError(res, 'Users can only close tickets', 400, 'INVALID_STATUS');
  }

  const updateData = {};

  if (message) {
    // Append message to description (or create a ticket_messages table)
    updateData.description = `${ticket.description}\n\n[User Update - ${new Date().toISOString()}]\n${message}`;
  }

  if (status === 'closed') {
    updateData.status = 'closed';
    updateData.resolvedAt = new Date();
  }

  const updated = await prisma.supportTicket.update({
    where: { ticketId: BigInt(id) },
    data: updateData,
  });

  sendSuccess(res, updated, 'Ticket updated successfully');
});

/**
 * Close ticket
 * POST /api/support/:id/close
 * @access Private
 */
exports.closeTicket = catchAsync(async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { ticketId: BigInt(id) },
  });

  if (!ticket) {
    return sendNotFound(res, 'Ticket');
  }

  // Check authorization
  if (ticket.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  if (ticket.status === 'closed') {
    return sendError(res, 'Ticket is already closed', 400, 'ALREADY_CLOSED');
  }

  const updated = await prisma.supportTicket.update({
    where: { ticketId: BigInt(id) },
    data: {
      status: 'closed',
      resolvedAt: new Date(),
    },
  });

  sendSuccess(res, updated, 'Ticket closed successfully');
});

/**
 * Reopen ticket
 * POST /api/support/:id/reopen
 * @access Private
 */
exports.reopenTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const ticket = await prisma.supportTicket.findUnique({
    where: { ticketId: BigInt(id) },
  });

  if (!ticket) {
    return sendNotFound(res, 'Ticket');
  }

  // Check authorization
  if (ticket.userId.toString() !== req.userId.toString()) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
    return sendError(res, 'Can only reopen closed or resolved tickets', 400, 'CANNOT_REOPEN');
  }

  const updated = await prisma.supportTicket.update({
    where: { ticketId: BigInt(id) },
    data: {
      status: 'open',
      description: reason ? `${ticket.description}\n\n[Reopened - ${new Date().toISOString()}]\n${reason}` : ticket.description,
      resolvedAt: null,
    },
  });

  sendSuccess(res, updated, 'Ticket reopened successfully');
});

/**
 * Get ticket statistics
 * GET /api/support/stats
 * @access Private
 */
exports.getTicketStats = catchAsync(async (req, res) => {
  const userId = req.userId;

  const [total, open, inProgress, resolved, closed] = await Promise.all([
    prisma.supportTicket.count({
      where: { userId },
    }),
    prisma.supportTicket.count({
      where: { userId, status: 'open' },
    }),
    prisma.supportTicket.count({
      where: { userId, status: 'in_progress' },
    }),
    prisma.supportTicket.count({
      where: { userId, status: 'resolved' },
    }),
    prisma.supportTicket.count({
      where: { userId, status: 'closed' },
    }),
  ]);

  // Get breakdown by type
  const typeBreakdown = await prisma.supportTicket.groupBy({
    by: ['ticketType'],
    where: { userId },
    _count: true,
  });

  sendSuccess(res, {
    total,
    open,
    inProgress,
    resolved,
    closed,
    byType: typeBreakdown.map((item) => ({
      type: item.ticketType,
      count: item._count,
    })),
  });
});

/**
 * Get FAQs
 * GET /api/support/faqs
 * @access Public
 */
exports.getFAQs = catchAsync(async (req, res) => {
  const { category } = req.query;

  const where = { isActive: true };

  if (category) {
    where.category = category;
  }

  const faqs = await prisma.faq.findMany({
    where,
    orderBy: { displayOrder: 'asc' },
  });

  // Group by category
  const grouped = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push({
      faqId: faq.faqId.toString(),
      question: faq.question,
      answer: faq.answer,
    });
    return acc;
  }, {});

  sendSuccess(res, grouped);
});

/**
 * Search FAQs
 * GET /api/support/faqs/search
 * @access Public
 */
exports.searchFAQs = catchAsync(async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 3) {
    return sendError(res, 'Search query must be at least 3 characters', 400, 'QUERY_TOO_SHORT');
  }

  const faqs = await prisma.faq.findMany({
    where: {
      isActive: true,
      OR: [{ question: { contains: query, mode: 'insensitive' } }, { answer: { contains: query, mode: 'insensitive' } }],
    },
    orderBy: { displayOrder: 'asc' },
    take: 10,
  });

  sendSuccess(res, faqs);
});

/**
 * Get ticket categories
 * GET /api/support/categories
 * @access Public
 */
exports.getTicketCategories = catchAsync(async (req, res) => {
  const categories = [
    {
      type: 'ride_issue',
      label: 'Ride Issue',
      description: 'Issues related to rides, drivers, or pickups',
      icon: 'car',
    },
    {
      type: 'payment_issue',
      label: 'Payment Issue',
      description: 'Payment, refund, or billing problems',
      icon: 'payment',
    },
    {
      type: 'driver_complaint',
      label: 'Driver Complaint',
      description: 'Complaints about driver behavior or service',
      icon: 'user-alert',
    },
    {
      type: 'vehicle_issue',
      label: 'Vehicle Issue',
      description: 'Problems with vehicle condition or cleanliness',
      icon: 'tool',
    },
    {
      type: 'account',
      label: 'Account',
      description: 'Account settings, profile, or login issues',
      icon: 'user',
    },
    {
      type: 'other',
      label: 'Other',
      description: 'Any other issues or feedback',
      icon: 'help',
    },
  ];

  sendSuccess(res, categories);
});

/**
 * Submit feedback
 * POST /api/support/feedback
 * @access Private
 */
exports.submitFeedback = catchAsync(async (req, res) => {
  const { feedbackType, message, rating } = req.body;

  if (!message) {
    return sendError(res, 'Feedback message is required', 400, 'MESSAGE_REQUIRED');
  }

  // Create as a support ticket with type 'other'
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.userId,
      ticketType: 'other',
      priority: 'low',
      subject: feedbackType || 'General Feedback',
      description: `Feedback (Rating: ${rating || 'N/A'})\n\n${message}`,
      status: 'open',
    },
  });

  sendCreated(res, ticket, 'Thank you for your feedback!');
});

// =====================================================
// ADMIN ROUTES (Add authentication middleware)
// =====================================================

/**
 * Get all tickets (Admin)
 * GET /api/support/admin/tickets
 * @access Private (Admin)
 */
exports.getAllTickets = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, ticketType, priority, assignedTo } = req.query;

  const skip = (page - 1) * limit;
  const where = {};

  if (status) {
    where.status = status;
  }

  if (ticketType) {
    where.ticketType = ticketType;
  }

  if (priority) {
    where.priority = priority;
  }

  if (assignedTo) {
    where.assignedTo = BigInt(assignedTo);
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  sendPaginated(res, tickets, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });
});

/**
 * Assign ticket to admin (Admin)
 * PUT /api/support/admin/:id/assign
 * @access Private (Admin)
 */
exports.assignTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body;

  const ticket = await prisma.supportTicket.update({
    where: { ticketId: BigInt(id) },
    data: {
      assignedTo: adminId ? BigInt(adminId) : null,
      status: 'in_progress',
    },
  });

  sendSuccess(res, ticket, 'Ticket assigned successfully');
});

/**
 * Resolve ticket (Admin)
 * PUT /api/support/admin/:id/resolve
 * @access Private (Admin)
 */
exports.resolveTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { resolutionNotes } = req.body;

  const ticket = await prisma.supportTicket.update({
    where: { ticketId: BigInt(id) },
    data: {
      status: 'resolved',
      resolutionNotes,
      resolvedAt: new Date(),
    },
  });

  // TODO: Send notification to user

  sendSuccess(res, ticket, 'Ticket resolved successfully');
});

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  updateTicket,
  closeTicket,
  reopenTicket,
  getTicketStats,
  getFAQs,
  searchFAQs,
  getTicketCategories,
  submitFeedback,
  getAllTickets,
  assignTicket,
  resolveTicket,
};
