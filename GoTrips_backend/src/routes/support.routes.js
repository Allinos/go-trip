const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const Joi = require('joi');

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const createTicketSchema = Joi.object({
  ticketType: Joi.string().valid('ride_issue', 'payment_issue', 'driver_complaint', 'vehicle_issue', 'account', 'other').required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  subject: Joi.string().min(5).max(255).required().messages({
    'string.min': 'Subject must be at least 5 characters',
  }),
  description: Joi.string().min(20).max(2000).required().messages({
    'string.min': 'Description must be at least 20 characters',
    'string.max': 'Description cannot exceed 2000 characters',
  }),
  rideId: Joi.string().pattern(/^\d+$/).optional(),
  rentalBookingId: Joi.string().pattern(/^\d+$/).optional(),
});

const updateTicketSchema = Joi.object({
  message: Joi.string().min(10).max(1000).optional(),
  status: Joi.string().valid('closed').optional(),
}).min(1);

const reopenTicketSchema = Joi.object({
  reason: Joi.string().min(10).max(500).optional(),
});

const feedbackSchema = Joi.object({
  feedbackType: Joi.string().max(100).optional(),
  message: Joi.string().min(10).max(1000).required().messages({
    'string.min': 'Feedback must be at least 10 characters',
  }),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

const ticketsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').optional(),
  ticketType: Joi.string().valid('ride_issue', 'payment_issue', 'driver_complaint', 'vehicle_issue', 'account', 'other').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedTo: Joi.string().pattern(/^\d+$/).optional(),
});

const faqQuerySchema = Joi.object({
  category: Joi.string().valid('passenger', 'partner', 'general', 'payment', 'rental').optional(),
});

const searchFaqSchema = Joi.object({
  query: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Search query must be at least 3 characters',
  }),
});

const assignTicketSchema = Joi.object({
  adminId: Joi.string().pattern(/^\d+$/).optional().allow(null),
});

const resolveTicketSchema = Joi.object({
  resolutionNotes: Joi.string().min(10).max(1000).optional(),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required(),
});

// =====================================================
// USER ROUTES
// =====================================================

/**
 * @route   POST /api/support
 * @desc    Create support ticket
 * @access  Private
 */
router.post('/', authenticate, generalLimiter, validateBody(createTicketSchema), supportController.createTicket);

/**
 * @route   GET /api/support/my-tickets
 * @desc    Get my support tickets
 * @access  Private
 */
router.get('/my-tickets', authenticate, validateQuery(ticketsQuerySchema), supportController.getMyTickets);

/**
 * @route   GET /api/support/stats
 * @desc    Get ticket statistics
 * @access  Private
 */
router.get('/stats', authenticate, supportController.getTicketStats);

/**
 * @route   GET /api/support/categories
 * @desc    Get ticket categories
 * @access  Public
 */
router.get('/categories', supportController.getTicketCategories);

/**
 * @route   GET /api/support/faqs
 * @desc    Get FAQs
 * @access  Public
 */
router.get('/faqs', validateQuery(faqQuerySchema), supportController.getFAQs);

/**
 * @route   GET /api/support/faqs/search
 * @desc    Search FAQs
 * @access  Public
 */
router.get('/faqs/search', validateQuery(searchFaqSchema), supportController.searchFAQs);

/**
 * @route   POST /api/support/feedback
 * @desc    Submit feedback
 * @access  Private
 */
router.post('/feedback', authenticate, validateBody(feedbackSchema), supportController.submitFeedback);

/**
 * @route   GET /api/support/:id
 * @desc    Get ticket by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateParams(idParamSchema), supportController.getTicketById);

/**
 * @route   PUT /api/support/:id
 * @desc    Update ticket (add message or close)
 * @access  Private
 */
router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(updateTicketSchema), supportController.updateTicket);

/**
 * @route   POST /api/support/:id/close
 * @desc    Close ticket
 * @access  Private
 */
router.post('/:id/close', authenticate, validateParams(idParamSchema), supportController.closeTicket);

/**
 * @route   POST /api/support/:id/reopen
 * @desc    Reopen ticket
 * @access  Private
 */
router.post('/:id/reopen', authenticate, validateParams(idParamSchema), validateBody(reopenTicketSchema), supportController.reopenTicket);

// =====================================================
// ADMIN ROUTES
// =====================================================

/**
 * @route   GET /api/support/admin/tickets
 * @desc    Get all tickets (Admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/tickets',
  authenticate,
  // Add admin check middleware here
  validateQuery(ticketsQuerySchema),
  supportController.getAllTickets
);

/**
 * @route   PUT /api/support/admin/:id/assign
 * @desc    Assign ticket to admin
 * @access  Private (Admin)
 */
router.put(
  '/admin/:id/assign',
  authenticate,
  // Add admin check middleware here
  validateParams(idParamSchema),
  validateBody(assignTicketSchema),
  supportController.assignTicket
);

/**
 * @route   PUT /api/support/admin/:id/resolve
 * @desc    Resolve ticket
 * @access  Private (Admin)
 */
router.put(
  '/admin/:id/resolve',
  authenticate,
  // Add admin check middleware here
  validateParams(idParamSchema),
  validateBody(resolveTicketSchema),
  supportController.resolveTicket
);

module.exports = router;
