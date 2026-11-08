'use strict';
/**
 * Idempotent seed: partner categories + document requirements, Assam districts & major points, FAQs.
 * Safe to run repeatedly (upserts). Fees/requirements edited later in the admin panel are NOT overwritten
 * unless SEED_OVERWRITE=1.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
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
      { scope: 'partner', docType: 'police_verification', label: 'Police verification certificate', hint: 'Optional, earns more trust from customers', isRequired: false, sortOrder: 6 },
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

  for (const d of DISTRICTS) {
    const district = await prisma.district.upsert({ where: { name: d.name }, create: { name: d.name }, update: {} });
    for (const p of d.points) {
      await prisma.place.upsert({ where: { districtId_nameKey: { districtId: district.id, nameKey: key(p) } }, create: { districtId: district.id, name: p, nameKey: key(p) }, update: {} });
    }
  }

  if ((await prisma.faq.count()) === 0) await prisma.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, sortOrder: i })) });

  console.log(`Seeded ${CATEGORIES.length} partner categories, ${DISTRICTS.length} districts, FAQs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
