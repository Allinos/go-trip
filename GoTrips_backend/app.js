const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
// const mongoSanitize = require('express-mongo-sanitize');

const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/error.middleware');
const { requestLogger } = require('./src/middleware/logger.middleware');

const app = express();


// Security middleware
app.use(helmet());
// app.use(cors({ origin: process.env.CORS_ORIGIN }));
// app.use(mongoSanitize());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

Date.prototype.toJSON = function() {
  return this.toISOString();
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;