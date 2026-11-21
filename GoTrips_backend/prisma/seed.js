'use strict';
/**
 * Idempotent seed: partner categories + document requirements, Assam districts & major points, FAQs.
 * Safe to run repeatedly (upserts). Fees/requirements edited later in the admin panel are NOT overwritten
 * unless SEED_OVERWRITE=1.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
// A Prisma client generated from an older schema has no partnerCategory model ("Cannot read properties of
// undefined (reading 'findUnique')"). Say how to fix it instead of crashing.
if (!prisma.partnerCategory || !prisma.review) {
  console.error('The Prisma client is out of date. Run:  npx prisma generate  &&  npx prisma migrate deploy  then seed again.');
  process.exit(1);
}
const overwrite = process.env.SEED_OVERWRITE === '1';
const key = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const ID_DOCS = [
  { scope: 'partner', docType: 'aadhaar', label: 'Aadhaar card', hint: 'Front and back. You may mask the first 8 digits.', requiresNumber: false, requiresBack: true, sortOrder: 1 },
  { scope: 'partner', docType: 'pan', label: 'PAN card', isRequired: false, requiresNumber: true, sortOrder: 5 },
];
const VEHICLE_DOCS = (commercial) => [
  { scope: 'vehicle', docType: 'rc', label: 'Registration Certificate (RC)', requiresNumber: true, requiresBack: true, sortOrder: 1 },
  { scope: 'vehicle', docType: 'insurance', label: 'Insurance', requiresNumber: true, requiresExpiry: true, sortOrder: 2 },
  { scope: 'vehicle', docType: 'permit', label: commercial ? 'Goods carriage permit' : 'Permit (taxi / contract carriage)', isRequired: commercial, requiresExpiry: true, sortOrder: 3 },
  { scope: 'vehicle', docType: 'fitness', label: 'Fitness certificate', isRequired: commercial, requiresExpiry: true, sortOrder: 4 },
  { scope: 'vehicle', docType: 'pollution', label: 'Pollution (PUC) certificate', isRequired: false, requiresExpiry: true, sortOrder: 5 },
];

const CATEGORIES = [
  {
    code: 'driver',
    name: 'Driver',
    description: 'Offer your driving services. Customers find you on the marketplace and call you directly.',
    icon: 'steering',
    registrationFee: 49900, // ₹499 (paise) — change in Admin → Partner types
    feeValidityDays: 365,
    hasDriverProfile: true,
    sortOrder: 1,
    requirements: [
      { scope: 'partner', docType: 'driving_license', label: 'Driving licence', hint: 'Clear photo of front and back', requiresNumber: true, requiresExpiry: true, requiresBack: true, sortOrder: 0 },
      ...ID_DOCS,
    ],
  },
  {
    code: 'taxi',
    name: 'Taxi / Passenger Vehicle Owner',
    description: 'Run start and return trips with your car, SUV or bus and take seat bookings.',
    icon: 'car',
    registrationFee: 0,
    canListVehicles: true,
    canCreateTrips: true,
    sortOrder: 2,
    requirements: [{ scope: 'partner', docType: 'driving_license', label: 'Driving licence', requiresNumber: true, requiresExpiry: true, requiresBack: true, sortOrder: 0 }, ...ID_DOCS, ...VEHICLE_DOCS(false)],
  },
  {
    code: 'rental',
    name: 'Car Rental Provider',
    description: 'List your vehicles for rent (self-drive or with driver) in your area.',
    icon: 'key',
    registrationFee: 0,
    canListVehicles: true,
    canListRentals: true,
    canCreateTrips: true,
    sortOrder: 3,
    requirements: [...ID_DOCS, { scope: 'partner', docType: 'business_proof', label: 'Business proof (GST / trade licence)', isRequired: false, requiresNumber: true, sortOrder: 6 }, ...VEHICLE_DOCS(false)],
  },
  {
    code: 'commercial',
    name: 'Commercial Vehicle / Fleet Owner',
    description: 'Trucks, pickups and tempos for goods transport. List your fleet and run trips.',
    icon: 'truck',
    registrationFee: 0,
    canListVehicles: true,
    canCreateTrips: true,
    canViewGoodsOrders: true,
    sortOrder: 4,
    requirements: [...ID_DOCS, { scope: 'partner', docType: 'business_proof', label: 'Business proof (GST / trade licence)', isRequired: false, requiresNumber: true, sortOrder: 6 }, ...VEHICLE_DOCS(true)],
  },
];

const DISTRICTS = [
  { name: 'Bajali', points: ['Pathsala', 'Sarthebari Road', 'Chowk Bazaar', 'Howly Gate'] },
  { name: 'Baksa', points: ['Mushalpur', 'Tamulpur', 'Barama Chariali', 'Goreswar'] },
  { name: 'Barpeta', points: ['Barpeta Road', 'Howly', 'Sarthebari', 'Kalgachia', 'Patbausi'] },
  { name: 'Biswanath', points: ['Biswanath Chariali', 'Gohpur', 'Pavoi Road', 'Monabarie'] },
  { name: 'Bongaigaon', points: ['New Bongaigaon Stn', 'Chapaguri', 'Borpara', 'Abhayapuri'] },
  { name: 'Cachar', points: ['Silchar ISBT', 'Rangirkhari', 'Tarapur', 'Malugram', 'Sonai'] },
  { name: 'Charaideo', points: ['Sonari Town', 'Sapakheti', 'Moranhat', 'Bhojo'] },
  { name: 'Chirang', points: ['Kajalgoan', 'Basugaon', 'Bijni', 'Dhaligaon'] },
  { name: 'Darrang', points: ['Mangaldai', 'Sipajhar', 'Kharupetia', 'Dalgaon'] },
  { name: 'Dhemaji', points: ['Dhemaji Town', 'Silapathar', 'Jonai', 'Gogamukh'] },
  { name: 'Dhubri', points: ['Dhubri Ghat', 'Gauripur', 'Bilasipara', 'Golakganj', 'Chapor'] },
  { name: 'Dibrugarh', points: ['Chowkidingee', 'Banipur', 'Thana Chariali', 'Lahowal', 'Moran'] },
  { name: 'Dima Hasao', points: ['Haflong', 'Maibang', 'Mahur', 'Umrangso'] },
  { name: 'Goalpara', points: ['Goalpara Town', 'Dudhnai', 'Agia', 'Lakhipur'] },
  { name: 'Golaghat', points: ['Golaghat Town', 'Bokakhat', 'Dergaon', 'Sarupathar', 'Numaligarh'] },
  { name: 'Hailakandi', points: ['Hailakandi Town', 'Lala', 'Algapur', 'Katlicherra'] },
  { name: 'Hojai', points: ['Hojai Town', 'Lanka', 'Lumding', 'Doboka'] },
  { name: 'Jorhat', points: ['Baruah Chariali', 'ISBT Jorhat', 'Rowriah', 'Mariani', 'Teok'] },
  { name: 'Kamrup Metropolitan', points: ['Paltan Bazaar', 'Khanapara', 'Adabari', 'Jalukbari', 'Ganeshguri', 'ISBT Betkuchi'] },
  { name: 'Kamrup Rural', points: ['Amingaon', 'Baihata Chariali', 'Rangia', 'Chaygaon', 'Hajo'] },
  { name: 'Karbi Anglong', points: ['Diphu', 'Bokajan', 'Dokmoka', 'Howraghat'] },
  { name: 'Karimganj', points: ['Karimganj Town', 'Badarpur', 'Patharkandi', 'Ramkrishna Nagar'] },
  { name: 'Kokrajhar', points: ['Kokrajhar Town', 'Gossaigaon', 'Fakiragram', 'Tamarhat'] },
  { name: 'Lakhimpur', points: ['North Lakhimpur', 'Bihpuria', 'Narayanpur', 'Dhakuakhana'] },
  { name: 'Majuli', points: ['Garamur', 'Kamalabari', 'Jengraimukh', 'Auniati'] },
  { name: 'Morigaon', points: ['Morigaon Town', 'Jagiroad', 'Mayong', 'Bhuragaon'] },
  { name: 'Nagaon', points: ['Haibargaon', 'Nagaon Bypass', 'Koliabor', 'Dhing', 'Samaguri'] },
  { name: 'Nalbari', points: ['Nalbari Town', 'Tihu', 'Mukalmua', 'Barama Road'] },
  { name: 'Sivasagar', points: ['Sivasagar Town', 'Demow', 'Nazira', 'Amguri'] },
  { name: 'Sonitpur', points: ['Mission Chariali', 'Tezpur Town', 'Dekargaon', 'Jamugurihat'] },
  { name: 'South Salmara-Mankachar', points: ['Hatsingimari', 'Mankachar', 'Fularchar'] },
  { name: 'Tamulpur', points: ['Tamulpur Town', 'Kumarikata', 'Nagrijuli'] },
  { name: 'Tinsukia', points: ['Thana Chariali', 'Borguri', 'Doomdooma', 'Digboi', 'Margherita'] },
  { name: 'Udalguri', points: ['Udalguri Town', 'Tangla', 'Mazbat', 'Kalaigaon'] },
  { name: 'West Karbi Anglong', points: ['Hamren', 'Baithalangso', 'Kheroni'] },
];


/**
 * Towns and cities added to every district's pick-up points. Trips can only use places from this list,
 * and customers search the same list, so both sides always use the same names.
 */
const TOWNS = {
  Bajali: ['Pathsala', 'Bhabanipur', 'Sarupeta'],
  Baksa: ['Mushalpur', 'Salbari', 'Jalah', 'Barama'],
  Barpeta: ['Barpeta', 'Barpeta Road', 'Sorbhog', 'Kalgachia', 'Sarthebari', 'Howly'],
  Biswanath: ['Biswanath Chariali', 'Gohpur', 'Behali', 'Sootea'],
  Bongaigaon: ['Bongaigaon', 'Abhayapuri', 'Boitamari', 'Manikpur'],
  Cachar: ['Silchar', 'Lakhipur', 'Sonai', 'Udharbond', 'Katigorah', 'Dholai'],
  Charaideo: ['Sonari', 'Sapekhati', 'Moranhat'],
  Chirang: ['Kajalgaon', 'Bijni', 'Basugaon', 'Sidli'],
  Darrang: ['Mangaldai', 'Sipajhar', 'Kharupetia', 'Dalgaon', 'Pathorighat'],
  Dhemaji: ['Dhemaji', 'Silapathar', 'Jonai', 'Gogamukh'],
  Dhubri: ['Dhubri', 'Gauripur', 'Bilasipara', 'Golakganj', 'Agomani', 'Chapar'],
  Dibrugarh: ['Dibrugarh', 'Naharkatia', 'Duliajan', 'Chabua', 'Moran', 'Namrup', 'Tengakhat'],
  'Dima Hasao': ['Haflong', 'Maibang', 'Umrangso', 'Mahur'],
  Goalpara: ['Goalpara', 'Dudhnoi', 'Krishnai', 'Agia', 'Matia', 'Lakhipur'],
  Golaghat: ['Golaghat', 'Bokakhat', 'Dergaon', 'Sarupathar', 'Numaligarh', 'Kamargaon', 'Merapani'],
  Hailakandi: ['Hailakandi', 'Lala', 'Algapur', 'Katlicherra'],
  Hojai: ['Hojai', 'Lanka', 'Lumding', 'Doboka', 'Murajhar'],
  Jorhat: ['Jorhat', 'Mariani', 'Teok', 'Titabor', 'Pulibor'],
  'Kamrup Metropolitan': ['Guwahati', 'Dispur', 'Six Mile', 'Beltola', 'Narengi', 'Maligaon', 'Lokhra', 'Sonapur', 'Basistha'],
  'Kamrup Rural': ['Rangia', 'Boko', 'Palasbari', 'Mirza', 'Sualkuchi', 'Guwahati Airport (Borjhar)', 'Kamalpur'],
  'Karbi Anglong': ['Diphu', 'Bokajan', 'Howraghat', 'Dokmoka'],
  Karimganj: ['Karimganj', 'Badarpur', 'Patharkandi', 'Nilambazar'],
  Kokrajhar: ['Kokrajhar', 'Gossaigaon', 'Kachugaon', 'Fakiragram'],
  Lakhimpur: ['North Lakhimpur', 'Narayanpur', 'Bihpuria', 'Dhakuakhana', 'Laluk'],
  Majuli: ['Garamur', 'Kamalabari', 'Jengraimukh'],
  Morigaon: ['Morigaon', 'Jagiroad', 'Mayong', 'Laharighat'],
  Nagaon: ['Nagaon', 'Raha', 'Kampur', 'Kaliabor', 'Samaguri', 'Dhing', 'Puranigudam', 'Jakhalabandha', 'Rupahi'],
  Nalbari: ['Nalbari', 'Tihu', 'Ghograpar', 'Belsor'],
  Sivasagar: ['Sivasagar', 'Nazira', 'Demow', 'Amguri', 'Simaluguri', 'Gaurisagar'],
  Sonitpur: ['Tezpur', 'Dhekiajuli', 'Jamugurihat', 'Rangapara', 'Balipara', 'Thelamara'],
  'South Salmara-Mankachar': ['Hatsingimari', 'Mankachar', 'South Salmara'],
  Tamulpur: ['Tamulpur', 'Kumarikata', 'Nagrijuli'],
  Tinsukia: ['Tinsukia', 'Digboi', 'Margherita', 'Doomdooma', 'Makum', 'Ledo', 'Sadiya', 'Kakopathar'],
  Udalguri: ['Udalguri', 'Tangla', 'Kalaigaon', 'Bhergaon'],
  'West Karbi Anglong': ['Hamren', 'Donkamokam', 'Baithalangso'],
};

/** Main cities in neighbouring states that trips from Assam often go to. */
const OTHER_STATES = [
  { name: 'East Khasi Hills', state: 'Meghalaya', points: ['Shillong', 'Police Bazar'] },
  { name: 'Ri-Bhoi', state: 'Meghalaya', points: ['Nongpoh', 'Byrnihat'] },
  { name: 'West Garo Hills', state: 'Meghalaya', points: ['Tura'] },
  { name: 'West Jaintia Hills', state: 'Meghalaya', points: ['Jowai'] },
  { name: 'Papum Pare', state: 'Arunachal Pradesh', points: ['Itanagar', 'Naharlagun'] },
  { name: 'East Siang', state: 'Arunachal Pradesh', points: ['Pasighat'] },
  { name: 'West Kameng', state: 'Arunachal Pradesh', points: ['Bomdila'] },
  { name: 'Tawang', state: 'Arunachal Pradesh', points: ['Tawang'] },
  { name: 'Dimapur', state: 'Nagaland', points: ['Dimapur'] },
  { name: 'Kohima', state: 'Nagaland', points: ['Kohima'] },
  { name: 'Imphal West', state: 'Manipur', points: ['Imphal'] },
  { name: 'West Tripura', state: 'Tripura', points: ['Agartala'] },
  { name: 'Aizawl', state: 'Mizoram', points: ['Aizawl'] },
  { name: 'Darjeeling', state: 'West Bengal', points: ['Siliguri'] },
  { name: 'Cooch Behar', state: 'West Bengal', points: ['Cooch Behar'] },
];

const FAQS = [
  { audience: 'user', question: 'How do I book a seat?', answer: 'Search your route, open a trip and tap "Request seats". The driver gets a notification and accepts or declines. You will be notified either way.' },
  { audience: 'user', question: 'How do I pay for a trip?', answer: 'Trips are paid directly to the driver (cash or UPI) as agreed. GoTrip does not charge customers.' },
  { audience: 'user', question: 'How can I see where my vehicle is?', answer: 'After your booking is accepted, open it. If the driver is sharing location, tap "View on Google Maps".' },
  { audience: 'user', question: 'How do I hire a driver?', answer: 'Open Marketplace → Drivers, check profiles and tap Call to talk to the driver directly.' },
  { audience: 'partner', question: 'Why do I need to pay a registration fee?', answer: 'Drivers pay a yearly listing fee to appear on the marketplace. Other partner types are free right now.' },
  { audience: 'partner', question: 'When will my vehicle be visible to customers?', answer: 'After our team verifies the vehicle and its documents, usually within 24 hours. You will get a notification.' },
  { audience: 'partner', question: 'What is a return trip?', answer: 'If you drive Nagaon → Guwahati, create a return trip Guwahati → Nagaon so passengers can book seats on your way back.' },
  { audience: 'partner', question: 'Are the earnings shown real payments?', answer: 'No. Earnings are estimates from your accepted and completed bookings. Passengers pay you directly.' },
  { audience: 'all', question: 'How do I contact support?', answer: 'Go to Settings → Help & Support and create a ticket, or call our support number.' },
];

// Assamese translations (stored in the `translations` JSON column; admins can edit them later).
const CATEGORY_AS = {
  driver: { name: 'চালক', description: 'আপোনাৰ গাড়ী চলোৱা সেৱা আগবঢ়াওক। গ্ৰাহকে মাৰ্কেটপ্লেচত আপোনাক বিচাৰি পোনপটীয়াকৈ ফোন কৰে।' },
  taxi: { name: 'টেক্সি / যাত্ৰীবাহী বাহনৰ মালিক', description: 'আপোনাৰ কাৰ, SUV বা বাছেৰে যাত্ৰা আৰু উভতনি যাত্ৰা চলাওক আৰু আসন বুকিং লওক।' },
  rental: { name: 'ভাড়াত গাড়ী দিওঁতা', description: 'আপোনাৰ অঞ্চলত বাহন ভাড়াত দিয়ক (নিজে চলোৱা বা চালকসহ)।' },
  commercial: { name: 'বাণিজ্যিক বাহন / ফ্লীটৰ মালিক', description: 'সামগ্ৰী কঢ়িওৱাৰ বাবে ট্ৰাক, পিকআপ আৰু টেম্প’। আপোনাৰ ফ্লীট তালিকাভুক্ত কৰক আৰু যাত্ৰা চলাওক।' },
};
const DOC_AS = {
  driving_license: { label: 'ড্ৰাইভিং লাইচেন্স', hint: 'আগ আৰু পিছফালৰ স্পষ্ট ফটো' },
  aadhaar: { label: 'আধাৰ কাৰ্ড', hint: 'আগ আৰু পিছফাল। প্ৰথম ৮টা সংখ্যা ঢাকি দিব পাৰে।' },
  pan: { label: 'পেন কাৰ্ড' },
  business_proof: { label: 'ব্যৱসায়ৰ প্ৰমাণ (GST / ট্ৰেড লাইচেন্স)' },
  rc: { label: 'পঞ্জীয়ন প্ৰমাণপত্ৰ (RC)' },
  insurance: { label: 'বীমা' },
  permit: { label: 'পাৰমিট' },
  fitness: { label: 'ফিটনেছ প্ৰমাণপত্ৰ' },
  pollution: { label: 'প্ৰদূষণ (PUC) প্ৰমাণপত্ৰ' },
};
const FAQ_AS = {
  'How do I book a seat?': { question: 'মই কেনেকৈ আসন বুক কৰিম?', answer: 'আপোনাৰ যাত্ৰাপথ বিচাৰক, এটা যাত্ৰা খোলক আৰু "আসন অনুৰোধ কৰক" টিপক। চালকে জাননী পাব আৰু গ্ৰহণ বা নাকচ কৰিব। দুয়োটা ক্ষেত্ৰতে আপোনাক জনোৱা হ’ব।' },
  'How do I pay for a trip?': { question: 'যাত্ৰাৰ ভাড়া কেনেকৈ দিম?', answer: 'ভাড়া পোনপটীয়াকৈ চালকক (নগদ বা UPI) দিয়ক। GoTrip এ গ্ৰাহকৰ পৰা কোনো মাচুল নলয়।' },
  'How can I see where my vehicle is?': { question: 'মোৰ গাড়ীখন ক’ত আছে কেনেকৈ চাম?', answer: 'বুকিং গ্ৰহণ হোৱাৰ পিছত বুকিংটো খোলক। চালকে অৱস্থান শ্বেয়াৰ কৰি থাকিলে "Google Maps ত চাওক" টিপক।' },
  'How do I hire a driver?': { question: 'মই কেনেকৈ চালক নিযুক্ত কৰিম?', answer: 'মাৰ্কেটপ্লেচ → চালক খোলক, প্ৰফাইলবোৰ চাওক আৰু চালকৰ সৈতে কথা পাতিবলৈ ফোন টিপক।' },
  'Why do I need to pay a registration fee?': { question: 'পঞ্জীয়ন মাচুল কিয় দিব লাগে?', answer: 'মাৰ্কেটপ্লেচত দেখা পাবলৈ চালকসকলে বছৰি লিষ্টিং মাচুল দিয়ে। আন পাৰ্টনাৰৰ বাবে এতিয়া বিনামূলীয়া।' },
  'When will my vehicle be visible to customers?': { question: 'মোৰ বাহন গ্ৰাহকে কেতিয়া দেখা পাব?', answer: 'আমাৰ দলে বাহন আৰু নথিপত্ৰ পৰীক্ষা কৰাৰ পিছত, সাধাৰণতে ২৪ ঘণ্টাৰ ভিতৰত। আপুনি জাননী পাব।' },
  'What is a return trip?': { question: 'উভতনি যাত্ৰা কি?', answer: 'যদি আপুনি নগাঁও → গুৱাহাটী যায়, গুৱাহাটী → নগাঁও উভতনি যাত্ৰা সৃষ্টি কৰক যাতে উভতি অহাৰ সময়ত যাত্ৰীয়ে আসন বুক কৰিব পাৰে।' },
  'Are the earnings shown real payments?': { question: 'দেখুওৱা উপাৰ্জন সঁচা পৰিশোধ নেকি?', answer: 'নহয়। উপাৰ্জন আপোনাৰ গ্ৰহণ আৰু সম্পূৰ্ণ বুকিঙৰ পৰা কৰা অনুমান। যাত্ৰীয়ে পোনপটীয়াকৈ আপোনাক ভাড়া দিয়ে।' },
  'How do I contact support?': { question: 'চাপোৰ্টৰ সৈতে কেনেকৈ যোগাযোগ কৰিম?', answer: 'ছেটিংছ → সহায় আৰু চাপোৰ্টলৈ গৈ টিকট সৃষ্টি কৰক, বা আমাৰ চাপোৰ্ট নম্বৰত ফোন কৰক।' },
};

async function main() {
  for (const c of CATEGORIES) {
    const { requirements, ...data } = c;
    const existing = await prisma.partnerCategory.findUnique({ where: { code: c.code } });
    const cat = existing ? (overwrite ? await prisma.partnerCategory.update({ where: { code: c.code }, data }) : existing) : await prisma.partnerCategory.create({ data });
    for (const r of requirements) {
      const where = { categoryId_scope_docType: { categoryId: cat.id, scope: r.scope, docType: r.docType } };
      const found = await prisma.documentRequirement.findUnique({ where });
      if (!found) await prisma.documentRequirement.create({ data: { ...r, categoryId: cat.id } });
      else if (overwrite) await prisma.documentRequirement.update({ where, data: r });
    }
  }

  const all = [...DISTRICTS.map((d) => ({ ...d, points: [...new Set([...(TOWNS[d.name] || []), ...d.points])] })), ...OTHER_STATES];
  for (const d of all) {
    const district = await prisma.district.upsert({ where: { name: d.name }, create: { name: d.name, ...(d.state ? { state: d.state } : {}) }, update: {} });
    for (const p of d.points) {
      await prisma.place.upsert({ where: { districtId_nameKey: { districtId: district.id, nameKey: key(p) } }, create: { districtId: district.id, name: p, nameKey: key(p) }, update: {} });
    }
  }

  if ((await prisma.faq.count()) === 0) await prisma.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, sortOrder: i })) });

  // Fill in Assamese text where it is still missing (never overwrites admin edits).
  for (const c of await prisma.partnerCategory.findMany({ include: { requirements: true } })) {
    if (!c.translations && CATEGORY_AS[c.code]) await prisma.partnerCategory.update({ where: { id: c.id }, data: { translations: { as: CATEGORY_AS[c.code] } } });
    for (const r of c.requirements) {
      const as = r.docType === 'permit' && c.code === 'commercial' ? { label: 'সামগ্ৰী পৰিবহণ পাৰমিট' } : r.docType === 'permit' ? { label: 'পাৰমিট (টেক্সি / কণ্ট্ৰেক্ট কেৰেজ)' } : DOC_AS[r.docType];
      if (!r.translations && as) await prisma.documentRequirement.update({ where: { id: r.id }, data: { translations: { as } } });
    }
  }
  for (const f of await prisma.faq.findMany()) {
    if (!f.translations && FAQ_AS[f.question]) await prisma.faq.update({ where: { id: f.id }, data: { translations: { as: FAQ_AS[f.question] } } });
  }

  console.log(`Seeded ${CATEGORIES.length} partner categories, ${all.length} districts with their towns, FAQs.`);
}

/** Apps read districts/places and partner types through the API cache: drop it so new data shows at once. */
async function clearCatalogCache() {
  try {
    const cache = require('../src/lib/cache');
    await Promise.race([cache.delPrefix('catalog:'), new Promise((r) => setTimeout(r, 3000))]);
    cache.redis?.disconnect?.();
  } catch {
    /* no Redis: the cache expires within an hour */
  }
}

main()
  .then(clearCatalogCache)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
