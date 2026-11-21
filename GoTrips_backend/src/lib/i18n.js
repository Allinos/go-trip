'use strict';
/**
 * Server-side language support (English + Assamese).
 *  - langOf(req): ?lang= → logged-in user's saved language → Accept-Language header → 'en'
 *  - tr(row, lang, field): picks row.translations[lang][field] when present (categories, documents, FAQs)
 *  - errorText(code, message, lang): Assamese text for common API errors
 */
const LANGS = ['en', 'as'];

function pick(value) {
  const v = String(value || '').toLowerCase();
  if (v.startsWith('as')) return 'as';
  return 'en';
}

function langOf(req) {
  if (req.query?.lang && LANGS.includes(String(req.query.lang))) return String(req.query.lang);
  if (req.user?.language) return req.user.language;
  return pick(req.headers['accept-language']);
}

const tr = (row, lang, field) => (lang !== 'en' && row?.translations?.[lang]?.[field]) || row?.[field];

// Assamese text for the most common user-facing errors (by error code, then by English message).
const AS_BY_CODE = {
  TRIP_STARTED: 'যাত্ৰা ইতিমধ্যে আৰম্ভ হৈছে। অনুগ্ৰহ কৰি চালকক ফোন কৰক।',
  CONTACT_FIRST: 'GoTrip ৰ জৰিয়তে ফোন বা মেছেজ কৰাৰ পিছতহে চালকক মূল্যায়ন কৰিব পাৰিব',
  NOT_COMPLETED: 'যাত্ৰা সম্পূৰ্ণ হোৱাৰ পিছতহে মূল্যায়ন কৰিব পাৰিব',
  BOOK_FIRST: 'চালকৰ সৈতে যোগাযোগৰ বিকল্প চাবলৈ বুকিং অনুৰোধ পঠিয়াওক',
  UNKNOWN_PLACE: 'প্ৰতিটো ষ্টপ তালিকাৰ পৰা বাছক',
  ONBOARDING_INCOMPLETE: 'দাখিল কৰাৰ আগতে সকলো আৱশ্যকীয় পদক্ষেপ সম্পূৰ্ণ কৰক',
  GOODS_REQUIRED: 'কি সামগ্ৰী পঠাব বিচাৰে লিখক',
  OVER_CAPACITY: 'এই বাহনখনে ইমান ওজন কঢ়িয়াব নোৱাৰে',
  VEHICLE_NOT_FOR_TRIPS: 'এই বাহনখনৰ বাবে প্ৰথমে "যাত্ৰাৰ বাবে ব্যৱহাৰ" অন কৰক',
  VEHICLE_OFF: 'এই বাহনখন বন্ধ আছে। যাত্ৰা সৃষ্টি কৰিবলৈ অন কৰক।',
  INVALID_PHONE: 'সঠিক ১০ সংখ্যাৰ মোবাইল নম্বৰ দিয়ক',
  OTP_EXPIRED: 'ক’ডটোৰ ম্যাদ উকলিছে। অনুগ্ৰহ কৰি নতুন ক’ড বিচাৰক।',
  OTP_USED: 'এই ক’ডটো ইতিমধ্যে ব্যৱহাৰ কৰা হৈছে। নতুন ক’ড বিচাৰক।',
  RATE_LIMITED: 'বহুত বেছি অনুৰোধ। অলপ পিছত পুনৰ চেষ্টা কৰক।',
  SMS_FAILED: 'এতিয়া SMS পঠিয়াব পৰা নগ’ল। পুনৰ চেষ্টা কৰক।',
  ACCOUNT_BLOCKED: 'এই একাউণ্টটো বন্ধ কৰা হৈছে। চাপোৰ্টৰ সৈতে যোগাযোগ কৰক।',
  PARTNER_SUSPENDED: 'আপোনাৰ পাৰ্টনাৰ একাউণ্ট স্থগিত কৰা হৈছে। চাপোৰ্টৰ সৈতে যোগাযোগ কৰক।',
  REGISTRATION_INCOMPLETE: 'অনুগ্ৰহ কৰি প্ৰথমে আপোনাৰ পঞ্জীয়ন সম্পূৰ্ণ কৰক',
  UNAUTHORIZED: 'অনুগ্ৰহ কৰি পুনৰ লগ ইন কৰক',
  TOKEN_EXPIRED: 'ছেচনৰ ম্যাদ উকলিছে। পুনৰ লগ ইন কৰক।',
  NOT_ENOUGH_SEATS: 'এই যাত্ৰাত পৰ্যাপ্ত আসন খালী নাই',
  TRIP_CLOSED: 'এই যাত্ৰাত এতিয়া বুকিং লোৱা হোৱা নাই',
  DUPLICATE_BOOKING: 'এই যাত্ৰাৰ বাবে আপোনাৰ ইতিমধ্যে এটা অনুৰোধ আছে',
  VEHICLE_NOT_VERIFIED: 'এই বাহনখন এতিয়াও পৰীক্ষা কৰা হোৱা নাই। এডমিনে অনুমোদন দিয়াৰ পিছত যাত্ৰা সৃষ্টি কৰিব পাৰিব।',
  TRIP_CLASH: 'এই বাহনখনৰ সেই সময়ৰ ১ ঘণ্টাৰ ভিতৰত আন এটা যাত্ৰা আছে',
  FEATURE_DISABLED: 'এই সুবিধাটো সোনকালে আহিব',
  PAYMENTS_UNAVAILABLE: 'অনলাইন পৰিশোধ এতিয়া উপলব্ধ নহয়। পিছত চেষ্টা কৰক।',
  ALREADY_PAID: 'আপোনাৰ পঞ্জীয়ন মাচুল ইতিমধ্যে পৰিশোধ কৰা হৈছে',
  SIGNATURE_INVALID: 'পৰিশোধ পৰীক্ষা বিফল হ’ল। যদি টকা কাটি লোৱা হৈছে, কেইমিনিটমানৰ ভিতৰত স্বয়ংক্ৰিয়ভাৱে নিশ্চিত কৰা হ’ব।',
  NOT_FOUND: 'বিচৰা তথ্য পোৱা নগ’ল',
  UPLOAD_ERROR: 'ফাইলটো আপলোড কৰিব পৰা নগ’ল',
  CAPABILITY_MISSING: 'আপোনাৰ পাৰ্টনাৰ প্ৰকাৰৰ বাবে এই সুবিধা উপলব্ধ নহয়',
  INTERNAL_ERROR: 'কিবা ভুল হ’ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',
};
const AS_BY_MESSAGE = {
  'Enter a valid 10-digit mobile number': 'সঠিক ১০ সংখ্যাৰ মোবাইল নম্বৰ দিয়ক',
  'phone: Enter a valid 10-digit mobile number': 'সঠিক ১০ সংখ্যাৰ মোবাইল নম্বৰ দিয়ক',
  'otp: Enter the 6-digit code': '৬ সংখ্যাৰ ক’ডটো দিয়ক',
  'Please log in to continue': 'আগবাঢ়িবলৈ অনুগ্ৰহ কৰি লগ ইন কৰক',
  'Please wait 30 seconds before requesting another code': 'নতুন ক’ড বিচৰাৰ আগতে ৩০ ছেকেণ্ড অপেক্ষা কৰক',
  'Too many wrong attempts. Please request a new code.': 'বহুবাৰ ভুল ক’ড দিয়া হৈছে। নতুন ক’ড বিচাৰক।',
  'Incorrect code. Please request a new one.': 'ক’ডটো ভুল। নতুন ক’ড বিচাৰক।',
  'This trip is full': 'এই যাত্ৰাৰ সকলো আসন ভৰ্তি',
  'Choose a drop point after your pickup point': 'উঠা ঠাইৰ পিছৰ এটা নমা ঠাই বাছক',
  'Please upload a photo of the document': 'নথিপত্ৰৰ এখন ফটো আপলোড কৰক',
  'Departure time must be in the future': 'যাত্ৰাৰ সময় ভৱিষ্যতৰ হ’ব লাগিব',
  'Start and destination cannot be the same place': 'আৰম্ভণি আৰু গন্তব্য একে ঠাই হ’ব নোৱাৰে',
  'The uploaded file is not a valid image': 'আপলোড কৰা ফাইলটো সঠিক ফটো নহয়',
  'A vehicle with this registration number is already registered': 'এই পঞ্জীয়ন নম্বৰৰ বাহন ইতিমধ্যে পঞ্জীয়ন কৰা হৈছে',
  'This booking cannot be cancelled': 'এই বুকিংটো বাতিল কৰিব নোৱাৰি',
  'Too many requests. Please wait a moment and try again.': 'বহুত বেছি অনুৰোধ। অলপ পিছত পুনৰ চেষ্টা কৰক।',
};

function errorText(code, message, lang) {
  if (lang !== 'as') return message;
  if (AS_BY_MESSAGE[message]) return AS_BY_MESSAGE[message];
  const m = /^Incorrect code\. (\d+) attempt\(s\) left\.$/.exec(message);
  if (m) return `ক’ডটো ভুল। আৰু ${m[1]} বাৰ চেষ্টা কৰিব পাৰিব।`;
  const seats = /^Only (\d+) seat\(s\) left$/.exec(message);
  if (seats) return `মাত্ৰ ${seats[1]}খন আসন খালী আছে`;
  if (code === 'VALIDATION_ERROR') {
    const field = String(message).split(':')[0];
    return `অনুগ্ৰহ কৰি দিয়া তথ্য পৰীক্ষা কৰক${field && field !== message ? ` (${field})` : ''}`;
  }
  return AS_BY_CODE[code] || message;
}

module.exports = { LANGS, langOf, tr, errorText, pick };
