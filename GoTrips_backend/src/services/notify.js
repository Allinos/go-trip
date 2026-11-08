'use strict';
/**
 * One place for every outbound notification.
 * Each event stores an in-app notification and sends FCM push, plus SMS or email where useful.
 * Text is rendered in the recipient's saved language (English / Assamese).
 * Delivery happens in the background, so API responses never wait for FCM, SMS or SMTP.
 */
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const push = require('./push');
const sms = require('./sms');
const email = require('./email');
const settings = require('./settings');
const { render } = require('./messages');

/**
 * key: template key in messages.js; vars: template variables; type: stored notification type
 * channels: { sms?: boolean, email?: boolean }
 */
async function deliver({ userId, app, key, type = key, vars, data = {}, channels = {} }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true, fullName: true, language: true } });
  if (!user) return;
  const lang = user.language || 'en';
  const msg = render(key, lang, { name: user.fullName, ...vars });
  // Key + variables are kept so the inbox can be shown again in whatever language the user picks later.
  await prisma.notification.create({ data: { userId, app, type, title: msg.title, body: msg.body, data: { ...data, _k: key, _v: vars || {} } } });
  const jobs = [push.sendToUser(userId, app, { title: msg.title, body: msg.body, data: { type, ...data } })];
  if (channels.sms && msg.sms) jobs.push(sms.send(user.phone, msg.sms));
  if (channels.email && msg.email && user.email) jobs.push(email.send(user.email, msg.email.subject, msg.title, msg.email.lines));
  const results = await Promise.allSettled(jobs);
  results.filter((r) => r.status === 'rejected').forEach((r) => logger.warn({ err: r.reason?.message, type }, 'notification channel failed'));
}

/** Queue a notification without blocking the request. */
function queue(payload) {
  setImmediate(() => deliver(payload).catch((e) => logger.error({ err: e.message, key: payload.key }, 'notification failed')));
}

const seg = (b) => ({ code: b.code, seats: b.seats, pickup: b.pickupName, drop: b.dropName });

const N = {
  async bookingRequested(booking, trip, partnerUserId) {
    const smsOn = await settings.get('sms_booking_alerts');
    queue({ userId: partnerUserId, app: 'partner', key: 'booking_request', vars: { ...seg(booking), name: booking.passengerName, at: trip.departureAt }, data: { bookingId: booking.id, tripId: trip.id, screen: 'BookingDetail' }, channels: { sms: smsOn } });
  },
  bookingResponded(booking, trip, accepted) {
    queue({ userId: booking.userId, app: 'user', key: accepted ? 'booking_accepted' : 'booking_rejected', vars: { ...seg(booking), at: trip.departureAt, reason: booking.statusReason }, data: { bookingId: booking.id, tripId: trip.id, screen: 'booking' } });
  },
  bookingCancelledByUser(booking, partnerUserId) {
    queue({ userId: partnerUserId, app: 'partner', key: 'booking_cancelled_by_user', type: 'booking_cancelled', vars: seg(booking), data: { bookingId: booking.id, tripId: booking.tripId, screen: 'BookingDetail' } });
  },
  bookingCancelledByPartner(booking, reason) {
    queue({ userId: booking.userId, app: 'user', key: 'booking_cancelled_by_partner', type: 'booking_cancelled', vars: { ...seg(booking), reason }, data: { bookingId: booking.id, screen: 'booking' } });
  },
  tripUpdated(booking, trip, changes) {
    queue({ userId: booking.userId, app: 'user', key: 'trip_updated', vars: { ...seg(booking), at: trip.departureAt, changes }, data: { bookingId: booking.id, tripId: trip.id, screen: 'booking' } });
  },
  bookingExpired(booking) {
    queue({ userId: booking.userId, app: 'user', key: 'booking_expired', vars: seg(booking), data: { bookingId: booking.id, screen: 'booking' } });
  },
  vehicleSuspended(vehicle, partnerUserId, reason) {
    queue({ userId: partnerUserId, app: 'partner', key: 'vehicle_suspended', vars: { vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`, reg: vehicle.registrationNumber, reason }, data: { vehicleId: vehicle.id, screen: 'VehicleDetail' }, channels: { sms: true } });
  },
  tripStarted(booking) {
    queue({ userId: booking.userId, app: 'user', key: 'trip_started', vars: seg(booking), data: { bookingId: booking.id, screen: 'booking' } });
  },
  registrationComplete(partner, user, listed) {
    queue({ userId: user.id, app: 'partner', key: 'registration_complete', vars: { listed }, data: { screen: 'Home' }, channels: { sms: true, email: true } });
  },
  paymentReceived(payment, user) {
    queue({ userId: user.id, app: 'partner', key: 'payment_success', vars: { amount: payment.amount, receipt: payment.receipt, paymentId: payment.razorpayPaymentId, validUntil: payment.validUntil }, data: { paymentId: payment.id, screen: 'Payments' }, channels: { email: true } });
  },
  vehicleReviewed(vehicle, partnerUserId, approved, reason) {
    queue({
      userId: partnerUserId,
      app: 'partner',
      key: approved ? 'vehicle_approved' : 'vehicle_rejected',
      vars: { vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`, reg: vehicle.registrationNumber, reason },
      data: { vehicleId: vehicle.id, screen: 'VehicleDetail' },
      channels: { sms: true },
    });
  },
  partnerReviewed(partnerUserId, approved, reason) {
    queue({ userId: partnerUserId, app: 'partner', key: approved ? 'documents_approved' : 'documents_rejected', vars: { reason }, data: { screen: approved ? 'Home' : 'Documents' }, channels: { sms: true } });
  },
  partnerSuspended(partnerUserId, reason) {
    queue({ userId: partnerUserId, app: 'partner', key: 'account_suspended', vars: { reason }, channels: { sms: true } });
  },
  listingExpiring(partnerUserId, expiresAt) {
    queue({ userId: partnerUserId, app: 'partner', key: 'listing_expiring', vars: { at: expiresAt }, data: { screen: 'Payments' } });
  },
  ticketReplied(ticket) {
    queue({ userId: ticket.userId, app: ticket.app, key: 'support_reply', vars: { subject: ticket.subject }, data: { ticketId: ticket.id, screen: 'Support' } });
  },
};

module.exports = { ...N, queue, deliver };
