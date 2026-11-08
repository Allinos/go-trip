'use strict';
/**
 * One place for every outbound notification.
 * Each call stores an in-app notification and sends FCM push. Some events also send SMS or email.
 * Delivery runs in the background (setImmediate), so API responses never wait on FCM, SMS or SMTP.
 */
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const push = require('./push');
const sms = require('./sms');
const email = require('./email');
const settings = require('./settings');

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const when = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

async function deliver({ userId, app, type, title, body, data = {}, smsText, emailTo, emailSubject, emailLines }) {
  await prisma.notification.create({ data: { userId, app, type, title, body, data } });
  const jobs = [push.sendToUser(userId, app, { title, body, data: { type, ...data } })];
  if (smsText) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (u) jobs.push(sms.send(u.phone, smsText));
  }
  if (emailTo) jobs.push(email.send(emailTo, emailSubject || title, title, emailLines || [body]));
  const results = await Promise.allSettled(jobs);
  results.filter((r) => r.status === 'rejected').forEach((r) => logger.warn({ err: r.reason?.message, type }, 'notification channel failed'));
}

/** Queue a notification without blocking the request. */
function queue(payload) {
  setImmediate(() => deliver(payload).catch((e) => logger.error({ err: e.message, type: payload.type }, 'notification failed')));
}

const N = {
  async bookingRequested(booking, trip, partnerUserId) {
    const smsOn = await settings.get('sms_booking_alerts');
    queue({
      userId: partnerUserId,
      app: 'partner',
      type: 'booking_request',
      title: 'New booking request',
      body: `${booking.passengerName || 'A passenger'} wants ${booking.seats} seat(s) ${booking.pickupName} → ${booking.dropName} on ${when(trip.departureAt)}.`,
      data: { bookingId: booking.id, tripId: trip.id, screen: 'BookingDetail' },
      smsText: smsOn ? `GoTrip: New booking request (${booking.code}) for ${booking.seats} seat(s) ${booking.pickupName} to ${booking.dropName}, ${when(trip.departureAt)}. Open the GoTrip Partner app to accept.` : undefined,
    });
  },
  bookingResponded(booking, trip, accepted) {
    queue({
      userId: booking.userId,
      app: 'user',
      type: accepted ? 'booking_accepted' : 'booking_rejected',
      title: accepted ? 'Booking confirmed 🎉' : 'Booking request declined',
      body: accepted
        ? `Your ${booking.seats} seat(s) ${booking.pickupName} → ${booking.dropName} on ${when(trip.departureAt)} are confirmed. You can call the driver from the app.`
        : `Your request ${booking.pickupName} → ${booking.dropName} was declined${booking.statusReason ? `: ${booking.statusReason}` : ''}. Try another trip.`,
      data: { bookingId: booking.id, tripId: trip.id, screen: 'booking' },
    });
  },
  bookingCancelledByUser(booking, partnerUserId) {
    queue({
      userId: partnerUserId,
      app: 'partner',
      type: 'booking_cancelled',
      title: 'Booking cancelled',
      body: `Booking ${booking.code} (${booking.seats} seat(s) ${booking.pickupName} → ${booking.dropName}) was cancelled by the passenger.`,
      data: { bookingId: booking.id, tripId: booking.tripId, screen: 'BookingDetail' },
    });
  },
  bookingCancelledByPartner(booking, reason) {
    queue({
      userId: booking.userId,
      app: 'user',
      type: 'booking_cancelled',
      title: 'Your booking was cancelled',
      body: `Booking ${booking.code} ${booking.pickupName} → ${booking.dropName} was cancelled by the driver${reason ? `: ${reason}` : ''}.`,
      data: { bookingId: booking.id, screen: 'booking' },
    });
  },
  tripStarted(booking) {
    queue({
      userId: booking.userId,
      app: 'user',
      type: 'trip_started',
      title: 'Your trip has started',
      body: `The vehicle for ${booking.pickupName} → ${booking.dropName} is on its way. Open the booking to see the driver's shared location.`,
      data: { bookingId: booking.id, screen: 'booking' },
    });
  },
  registrationComplete(partner, user, listed) {
    queue({
      userId: user.id,
      app: 'partner',
      type: 'registration_complete',
      title: 'Registration complete',
      body: listed ? 'Your profile is now live on the GoTrip marketplace.' : 'Your registration is complete. Our team will verify your documents shortly.',
      data: { screen: 'Home' },
      smsText: `GoTrip: Welcome aboard! Your partner registration is complete${listed ? ' and your profile is live on the marketplace' : ''}.`,
      emailTo: user.email,
      emailSubject: 'Welcome to GoTrip Partner',
      emailLines: [`Hi ${user.fullName || 'Partner'},`, 'Your GoTrip partner registration is complete.', listed ? 'Your profile is now visible to customers on the marketplace.' : 'We will verify your documents and notify you.'],
    });
  },
  paymentReceived(payment, user) {
    queue({
      userId: user.id,
      app: 'partner',
      type: 'payment_success',
      title: 'Payment received',
      body: `We received ${rupees(payment.amount)} for your registration fee. Receipt: ${payment.receipt}.`,
      data: { paymentId: payment.id, screen: 'Payments' },
      emailTo: user.email,
      emailSubject: `Payment receipt ${payment.receipt}`,
      emailLines: [
        `Hi ${user.fullName || 'Partner'},`,
        `Thank you. We received your payment of ${rupees(payment.amount)}.`,
        `Receipt: ${payment.receipt}`,
        `Razorpay payment ID: ${payment.razorpayPaymentId}`,
        payment.validUntil ? `Your listing is valid until ${new Date(payment.validUntil).toDateString()}.` : 'Your listing does not expire.',
      ],
    });
  },
  vehicleReviewed(vehicle, partnerUserId, approved, reason) {
    const name = `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`;
    queue({
      userId: partnerUserId,
      app: 'partner',
      type: approved ? 'vehicle_approved' : 'vehicle_rejected',
      title: approved ? 'Vehicle approved ✅' : 'Vehicle needs changes',
      body: approved ? `${name} is verified and now visible to customers.` : `${name} was not approved: ${reason}. Please update and resubmit.`,
      data: { vehicleId: vehicle.id, screen: 'VehicleDetails' },
      smsText: `GoTrip: Your vehicle ${vehicle.registrationNumber} was ${approved ? 'approved and is now live' : `not approved (${reason}). Please update it in the app`}.`,
    });
  },
  partnerReviewed(partnerUserId, approved, reason) {
    queue({
      userId: partnerUserId,
      app: 'partner',
      type: approved ? 'documents_approved' : 'documents_rejected',
      title: approved ? 'Profile verified ✅' : 'Documents need attention',
      body: approved ? 'Your documents are verified. You now have the Verified badge.' : `Some documents were rejected: ${reason}. Please re-upload them.`,
      data: { screen: approved ? 'Home' : 'Documents' },
      smsText: `GoTrip: ${approved ? 'Your partner profile is verified.' : `Your documents need attention (${reason}). Please re-upload in the app.`}`,
    });
  },
  partnerSuspended(partnerUserId, reason) {
    queue({ userId: partnerUserId, app: 'partner', type: 'account_suspended', title: 'Account suspended', body: `Your partner account was suspended: ${reason}. Contact support for help.`, smsText: `GoTrip: Your partner account was suspended (${reason}). Contact support.` });
  },
  listingExpiring(partnerUserId, expiresAt) {
    queue({ userId: partnerUserId, app: 'partner', type: 'listing_expiring', title: 'Listing expiring soon', body: `Your marketplace listing expires on ${new Date(expiresAt).toDateString()}. Renew to stay visible.`, data: { screen: 'Payments' } });
  },
  ticketReplied(ticket) {
    queue({ userId: ticket.userId, app: ticket.app, type: 'support_reply', title: 'Support replied', body: `We replied to your ticket "${ticket.subject}".`, data: { ticketId: ticket.id, screen: 'Support' } });
  },
};

module.exports = { ...N, queue, deliver };
