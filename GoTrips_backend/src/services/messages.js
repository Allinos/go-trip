'use strict';
/** Notification / SMS / email texts in English and Assamese. Each template returns { title, body, sms?, email? }. */

const AS_DIGITS = '০১২৩৪৫৬৭৮৯';
const asNum = (n) => String(n).replace(/\d/g, (d) => AS_DIGITS[d]);
const when = (d, lang) => new Date(d).toLocaleString(lang === 'as' ? 'as-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const day = (d, lang) => new Date(d).toLocaleDateString(lang === 'as' ? 'as-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });

const T = {
  booking_request: {
    en: (v) => ({
      title: 'New booking request',
      body: `${v.name || 'A passenger'} wants ${v.seats} seat(s) ${v.pickup} → ${v.drop} on ${when(v.at, 'en')}.`,
      sms: `GoTrip: New booking request (${v.code}) for ${v.seats} seat(s) ${v.pickup} to ${v.drop}, ${when(v.at, 'en')}. Open the GoTrip Partner app to accept.`,
    }),
    as: (v) => ({
      title: 'নতুন বুকিং অনুৰোধ',
      body: `${v.name || 'এজন যাত্ৰী'}য়ে ${when(v.at, 'as')}ত ${v.pickup} → ${v.drop} যাত্ৰাৰ বাবে ${asNum(v.seats)}খন আসন বিচাৰিছে।`,
      sms: `GoTrip: নতুন বুকিং অনুৰোধ (${v.code}) - ${asNum(v.seats)}খন আসন, ${v.pickup} ৰ পৰা ${v.drop}, ${when(v.at, 'as')}। গ্ৰহণ কৰিবলৈ GoTrip Partner এপ খোলক।`,
    }),
  },
  booking_accepted: {
    en: (v) => ({ title: 'Booking confirmed 🎉', body: `Your ${v.seats} seat(s) ${v.pickup} → ${v.drop} on ${when(v.at, 'en')} are confirmed. You can call the driver from the app.` }),
    as: (v) => ({ title: 'বুকিং নিশ্চিত হ’ল 🎉', body: `${when(v.at, 'as')}ৰ ${v.pickup} → ${v.drop} যাত্ৰাত আপোনাৰ ${asNum(v.seats)}খন আসন নিশ্চিত হৈছে। এপৰ পৰা চালকক ফোন কৰিব পাৰে।` }),
  },
  booking_rejected: {
    en: (v) => ({ title: 'Booking request declined', body: `Your request ${v.pickup} → ${v.drop} was declined${v.reason ? `: ${v.reason}` : ''}. Try another trip.` }),
    as: (v) => ({ title: 'বুকিং অনুৰোধ নাকচ হ’ল', body: `${v.pickup} → ${v.drop} যাত্ৰাৰ অনুৰোধটো নাকচ কৰা হৈছে${v.reason ? `: ${v.reason}` : ''}। অন্য এটা যাত্ৰা চাওক।` }),
  },
  booking_cancelled_by_user: {
    en: (v) => ({ title: 'Booking cancelled', body: `Booking ${v.code} (${v.seats} seat(s) ${v.pickup} → ${v.drop}) was cancelled by the passenger.` }),
    as: (v) => ({ title: 'বুকিং বাতিল', body: `যাত্ৰীয়ে বুকিং ${v.code} (${asNum(v.seats)}খন আসন, ${v.pickup} → ${v.drop}) বাতিল কৰিছে।` }),
  },
  booking_cancelled_by_partner: {
    en: (v) => ({ title: 'Your booking was cancelled', body: `Booking ${v.code} ${v.pickup} → ${v.drop} was cancelled by the driver${v.reason ? `: ${v.reason}` : ''}.` }),
    as: (v) => ({ title: 'আপোনাৰ বুকিং বাতিল কৰা হ’ল', body: `চালকে বুকিং ${v.code} (${v.pickup} → ${v.drop}) বাতিল কৰিছে${v.reason ? `: ${v.reason}` : ''}।` }),
  },
  trip_started: {
    en: (v) => ({ title: 'Your trip has started', body: `The vehicle for ${v.pickup} → ${v.drop} is on its way. Open the booking to see the driver's shared location.` }),
    as: (v) => ({ title: 'আপোনাৰ যাত্ৰা আৰম্ভ হৈছে', body: `${v.pickup} → ${v.drop} যাত্ৰাৰ গাড়ীখন ৰাওনা হৈছে। চালকৰ লাইভ অৱস্থান চাবলৈ বুকিংটো খোলক।` }),
  },
  trip_updated: {
    en: (v) => ({ title: 'Trip details changed', body: `The driver changed your trip ${v.pickup} → ${v.drop} (booking ${v.code}): ${v.changes === 'time' ? `it now departs ${when(v.at, 'en')}` : v.changes === 'fare' ? 'the fare changed' : `it now departs ${when(v.at, 'en')} and the fare changed`}. Open the booking for details.` }),
    as: (v) => ({ title: 'যাত্ৰাৰ তথ্য সলনি হৈছে', body: `চালকে আপোনাৰ ${v.pickup} → ${v.drop} যাত্ৰা (বুকিং ${v.code}) সলনি কৰিছে: ${v.changes === 'time' ? `এতিয়া ${when(v.at, 'as')}ত ৰাওনা হ’ব` : v.changes === 'fare' ? 'ভাড়া সলনি হৈছে' : `এতিয়া ${when(v.at, 'as')}ত ৰাওনা হ’ব আৰু ভাড়া সলনি হৈছে`}। বিৱৰণৰ বাবে বুকিংটো খোলক।` }),
  },
  booking_expired: {
    en: (v) => ({ title: 'Booking request not answered', body: `The driver did not respond to your request ${v.pickup} → ${v.drop} and the trip has left. Please book another trip.` }),
    as: (v) => ({ title: 'বুকিং অনুৰোধৰ উত্তৰ নাপালে', body: `${v.pickup} → ${v.drop} যাত্ৰাৰ অনুৰোধৰ চালকে উত্তৰ নিদিলে আৰু যাত্ৰাটো ৰাওনা হৈছে। অনুগ্ৰহ কৰি অন্য যাত্ৰা বুক কৰক।` }),
  },
  vehicle_suspended: {
    en: (v) => ({ title: 'Vehicle suspended', body: `${v.vehicle} was suspended: ${v.reason}. Its upcoming trips no longer take bookings. Contact support for help.`, sms: `GoTrip: Your vehicle ${v.reg} was suspended (${v.reason}). Contact support.` }),
    as: (v) => ({ title: 'বাহন স্থগিত', body: `${v.vehicle} স্থগিত কৰা হৈছে: ${v.reason}। ইয়াৰ আগন্তুক যাত্ৰাত আৰু বুকিং লোৱা নহ’ব। সহায়ৰ বাবে চাপোৰ্টৰ সৈতে যোগাযোগ কৰক।`, sms: `GoTrip: আপোনাৰ বাহন ${v.reg} স্থগিত কৰা হৈছে (${v.reason})। চাপোৰ্টৰ সৈতে যোগাযোগ কৰক।` }),
  },
  registration_complete: {
    en: (v) => ({
      title: 'Registration complete',
      body: v.listed ? 'Your profile is now live on the GoTrip marketplace.' : 'Your registration is complete. Our team will verify your documents shortly.',
      sms: `GoTrip: Welcome aboard! Your partner registration is complete${v.listed ? ' and your profile is live on the marketplace' : ''}.`,
      email: { subject: 'Welcome to GoTrip Partner', lines: [`Hi ${v.name || 'Partner'},`, 'Your GoTrip partner registration is complete.', v.listed ? 'Your profile is now visible to customers on the marketplace.' : 'We will verify your documents and notify you.'] },
    }),
    as: (v) => ({
      title: 'পঞ্জীয়ন সম্পূৰ্ণ',
      body: v.listed ? 'আপোনাৰ প্ৰফাইল এতিয়া GoTrip মাৰ্কেটপ্লেচত দেখা গৈছে।' : 'আপোনাৰ পঞ্জীয়ন সম্পূৰ্ণ হৈছে। আমাৰ দলে সোনকালে আপোনাৰ নথিপত্ৰ পৰীক্ষা কৰিব।',
      sms: `GoTrip: আপোনাক স্বাগতম! আপোনাৰ পাৰ্টনাৰ পঞ্জীয়ন সম্পূৰ্ণ হৈছে${v.listed ? ' আৰু আপোনাৰ প্ৰফাইল মাৰ্কেটপ্লেচত দেখা গৈছে' : ''}।`,
      email: { subject: 'GoTrip Partner লৈ স্বাগতম', lines: [`নমস্কাৰ ${v.name || ''},`, 'আপোনাৰ GoTrip পাৰ্টনাৰ পঞ্জীয়ন সম্পূৰ্ণ হৈছে।', v.listed ? 'আপোনাৰ প্ৰফাইল এতিয়া গ্ৰাহকসকলে মাৰ্কেটপ্লেচত দেখা পাব।' : 'আমি আপোনাৰ নথিপত্ৰ পৰীক্ষা কৰি আপোনাক জনাম।'] },
    }),
  },
  payment_success: {
    en: (v) => ({
      title: 'Payment received',
      body: `We received ${rupees(v.amount)} for your registration fee. Receipt: ${v.receipt}.`,
      email: { subject: `Payment receipt ${v.receipt}`, lines: [`Hi ${v.name || 'Partner'},`, `Thank you. We received your payment of ${rupees(v.amount)}.`, `Receipt: ${v.receipt}`, `Razorpay payment ID: ${v.paymentId}`, v.validUntil ? `Your listing is valid until ${day(v.validUntil, 'en')}.` : 'Your listing does not expire.'] },
    }),
    as: (v) => ({
      title: 'পৰিশোধ লাভ কৰা হ’ল',
      body: `আপোনাৰ পঞ্জীয়ন মাচুলৰ বাবে ${rupees(v.amount)} লাভ কৰা হৈছে। ৰচিদ: ${v.receipt}।`,
      email: { subject: `পৰিশোধৰ ৰচিদ ${v.receipt}`, lines: [`নমস্কাৰ ${v.name || ''},`, `ধন্যবাদ। আমি আপোনাৰ ${rupees(v.amount)} পৰিশোধ লাভ কৰিছোঁ।`, `ৰচিদ: ${v.receipt}`, `Razorpay পেমেণ্ট ID: ${v.paymentId}`, v.validUntil ? `আপোনাৰ লিষ্টিং ${day(v.validUntil, 'as')} লৈকে বৈধ।` : 'আপোনাৰ লিষ্টিঙৰ কোনো ম্যাদ নাই।'] },
    }),
  },
  vehicle_approved: {
    en: (v) => ({ title: 'Vehicle approved ✅', body: `${v.vehicle} is verified and now visible to customers.`, sms: `GoTrip: Your vehicle ${v.reg} was approved and is now live.` }),
    as: (v) => ({ title: 'বাহন অনুমোদিত ✅', body: `${v.vehicle} পৰীক্ষা কৰা হৈছে আৰু এতিয়া গ্ৰাহকে দেখা পাব।`, sms: `GoTrip: আপোনাৰ বাহন ${v.reg} অনুমোদিত হৈছে আৰু এতিয়া দেখা গৈছে।` }),
  },
  vehicle_rejected: {
    en: (v) => ({ title: 'Vehicle needs changes', body: `${v.vehicle} was not approved: ${v.reason}. Please update and resubmit.`, sms: `GoTrip: Your vehicle ${v.reg} was not approved (${v.reason}). Please update it in the app.` }),
    as: (v) => ({ title: 'বাহনত সংশোধন প্ৰয়োজন', body: `${v.vehicle} অনুমোদিত হোৱা নাই: ${v.reason}। অনুগ্ৰহ কৰি সংশোধন কৰি পুনৰ জমা দিয়ক।`, sms: `GoTrip: আপোনাৰ বাহন ${v.reg} অনুমোদিত হোৱা নাই (${v.reason})। এপত সংশোধন কৰক।` }),
  },
  documents_approved: {
    en: () => ({ title: 'Profile verified ✅', body: 'Your documents are verified. You now have the Verified badge.', sms: 'GoTrip: Your partner profile is verified.' }),
    as: () => ({ title: 'প্ৰফাইল পৰীক্ষিত ✅', body: 'আপোনাৰ নথিপত্ৰ পৰীক্ষা কৰা হৈছে। আপুনি এতিয়া Verified বেজ পাইছে।', sms: 'GoTrip: আপোনাৰ পাৰ্টনাৰ প্ৰফাইল পৰীক্ষা কৰা হৈছে।' }),
  },
  documents_rejected: {
    en: (v) => ({ title: 'Documents need attention', body: `Some documents were rejected: ${v.reason}. Please re-upload them.`, sms: `GoTrip: Your documents need attention (${v.reason}). Please re-upload in the app.` }),
    as: (v) => ({ title: 'নথিপত্ৰত মনোযোগ দিয়ক', body: `কিছুমান নথিপত্ৰ নাকচ কৰা হৈছে: ${v.reason}। অনুগ্ৰহ কৰি পুনৰ আপলোড কৰক।`, sms: `GoTrip: আপোনাৰ নথিপত্ৰত সমস্যা আছে (${v.reason})। এপত পুনৰ আপলোড কৰক।` }),
  },
  account_suspended: {
    en: (v) => ({ title: 'Account suspended', body: `Your partner account was suspended: ${v.reason}. Contact support for help.`, sms: `GoTrip: Your partner account was suspended (${v.reason}). Contact support.` }),
    as: (v) => ({ title: 'একাউণ্ট স্থগিত', body: `আপোনাৰ পাৰ্টনাৰ একাউণ্ট স্থগিত কৰা হৈছে: ${v.reason}। সহায়ৰ বাবে চাপোৰ্টৰ সৈতে যোগাযোগ কৰক।`, sms: `GoTrip: আপোনাৰ পাৰ্টনাৰ একাউণ্ট স্থগিত কৰা হৈছে (${v.reason})। চাপোৰ্টৰ সৈতে যোগাযোগ কৰক।` }),
  },
  listing_expiring: {
    en: (v) => ({ title: 'Listing expiring soon', body: `Your marketplace listing expires on ${day(v.at, 'en')}. Renew to stay visible.` }),
    as: (v) => ({ title: 'লিষ্টিঙৰ ম্যাদ শেষ হ’বলৈ ওলাইছে', body: `আপোনাৰ মাৰ্কেটপ্লেচ লিষ্টিঙৰ ম্যাদ ${day(v.at, 'as')}ত শেষ হ’ব। দেখা পাই থাকিবলৈ নবীকৰণ কৰক।` }),
  },
  support_reply: {
    en: (v) => ({ title: 'Support replied', body: `We replied to your ticket "${v.subject}".` }),
    as: (v) => ({ title: 'চাপোৰ্টৰ উত্তৰ', body: `আপোনাৰ টিকট "${v.subject}" ৰ উত্তৰ দিয়া হৈছে।` }),
  },
};

const OTP_SMS = {
  en: (otp, mins) => `${otp} is your GoTrip verification code. It is valid for ${mins} minutes. Do not share it with anyone.`,
  as: (otp, mins) => `${otp} আপোনাৰ GoTrip পৰীক্ষণ ক’ড। ই ${asNum(mins)} মিনিটলৈ বৈধ। কাকো এই ক’ড নিদিব।`,
};

function render(key, lang, vars) {
  const t = T[key];
  if (!t) throw new Error(`Unknown message ${key}`);
  return (t[lang] || t.en)(vars || {});
}

const has = (key) => !!T[key];

module.exports = { render, has, OTP_SMS, asNum };
