'use strict';
const express = require('express');
const auth = require('./modules/auth');
const users = require('./modules/users');
const partners = require('./modules/partners/routes');
const vehicles = require('./modules/vehicles');
const trips = require('./modules/trips');
const bookings = require('./modules/bookings');
const payments = require('./modules/payments');
const marketplace = require('./modules/marketplace');
const goods = require('./modules/goods');
const catalog = require('./modules/catalog');
const admin = require('./modules/admin');

const router = express.Router();

// Public reference data
router.use('/', catalog);

// Auth & the logged-in user's own data (customer and partner apps)
router.use('/auth', auth);
router.use('/me', users.router);

// Customer-facing
router.use('/marketplace', marketplace);
router.use('/rentals', vehicles.publicRouter);
router.use('/trips', trips.publicRouter);
router.use('/bookings', bookings.userRouter);
router.use('/goods-orders', goods.userRouter);
router.use('/payments', payments.publicRouter);

// Partner app
router.use('/partner/vehicles', vehicles.partnerRouter);
router.use('/partner/trips', trips.partnerRouter);
router.use('/partner/bookings', bookings.partnerRouter);
router.use('/partner/payments', payments.partnerRouter);
router.use('/partner/goods-orders', goods.partnerRouter);
router.use('/partner', partners);

// Admin panel
router.use('/admin', admin);

module.exports = router;
