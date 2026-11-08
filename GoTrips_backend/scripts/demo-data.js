'use strict';
/**
 * Demo data for local testing / demos: customers, partners of every type, vehicles in every
 * verification state, start + return trips, booking requests and a paid registration fee.
 * Refuses to run when NODE_ENV=production. Run after `npm run seed`:  npm run seed:demo
 */
require('dotenv').config();
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to create demo data in production');
  process.exit(1);
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const key = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const hours = (h) => new Date(Date.now() + h * 3600_000);
const DEMO_FILE = 'demo/placeholder.jpg';

async function partner(phone, name, code, extra = {}) {
  const category = await prisma.partnerCategory.findUnique({ where: { code }, include: { requirements: true } });
  const user = await prisma.user.upsert({ where: { phone }, create: { phone, fullName: name }, update: {} });
  const existing = await prisma.partner.findUnique({ where: { userId: user.id } });
  if (existing) return existing;
  const p = await prisma.partner.create({
    data: { userId: user.id, categoryId: category.id, district: extra.district || 'Nagaon', city: extra.city || 'Nagaon', accountStatus: 'active', verificationStatus: extra.verification || 'pending', activatedAt: new Date(), submittedAt: new Date(), businessName: extra.businessName, ...(category.registrationFee ? { feePaidAt: new Date(), listingExpiresAt: hours(24 * 365) } : {}) },
  });
  for (const r of category.requirements.filter((x) => x.scope === 'partner' && x.isRequired)) {
    await prisma.partnerDocument.create({ data: { partnerId: p.id, docType: r.docType, frontKey: DEMO_FILE, docNumber: r.requiresNumber ? 'DEMO12345' : null, expiryDate: r.requiresExpiry ? hours(24 * 900) : null, status: extra.verification === 'approved' ? 'approved' : 'pending' } });
  }
  return p;
}

async function main() {
  const customers = [];
  for (const [i, n] of ['Ananya Bora', 'Rahul Kalita', 'Priya Saikia', 'Dipankar Nath'].entries()) customers.push(await prisma.user.upsert({ where: { phone: `+91900000000${i}` }, create: { phone: `+91900000000${i}`, fullName: n, city: 'Guwahati' }, update: {} }));

  const d1 = await partner('+919100000001', 'Bikash Deka', 'driver', { district: 'Kamrup Metropolitan', city: 'Guwahati', verification: 'approved' });
  const d2 = await partner('+919100000002', 'Mridul Hazarika', 'driver', { district: 'Nagaon', verification: 'pending' });
  for (const [p, exp, yrs] of [[d1, 'Outstation and airport trips', 8], [d2, 'Local and daily office driving', 3]]) {
    await prisma.driverProfile.upsert({
      where: { partnerId: p.id },
      create: { partnerId: p.id, headline: exp, bio: 'Safe, punctual and polite. Knows Assam roads well.', hasPriorExperience: true, experienceYears: yrs, experienceDetails: 'Worked with a travel agency', licenseNumber: 'AS0120150012345', licenseTypes: ['LMV', 'TRANS'], licenseExpiry: hours(24 * 1000), vehicleTypes: ['car', 'suv'], languages: ['Assamese', 'Hindi', 'English'], serviceAreas: ['Guwahati', 'Nagaon'], workTypes: ['outstation', 'personal'], availability: 'full_time', expectedPayMin: 800, expectedPayMax: 1200, payUnit: 'per_day', district: p.district, city: p.city, isListed: true, listedAt: new Date(), completeness: 87 },
      update: {},
    });
    const user = await prisma.user.findFirst({ where: { partner: { id: p.id } } });
    if (!(await prisma.payment.findFirst({ where: { partnerId: p.id } })))
      await prisma.payment.create({ data: { userId: user.id, partnerId: p.id, amount: 49900, status: 'paid', receipt: `RCPTDEMO${p.id}`, razorpayOrderId: `order_DEMO${p.id}`, razorpayPaymentId: `pay_DEMO${p.id}`, method: 'upi', paidAt: new Date(), validUntil: hours(24 * 365), categoryCode: 'driver' } });
  }

  const taxi = await partner('+919100000003', 'Rupam Das', 'taxi', { verification: 'approved' });
  const rental = await partner('+919100000004', 'Hills Car Rentals', 'rental', { district: 'Kamrup Metropolitan', city: 'Guwahati', businessName: 'Hills Car Rentals', verification: 'approved' });
  const fleet = await partner('+919100000005', 'Assam Cargo Movers', 'commercial', { businessName: 'Assam Cargo Movers' });

  const veh = async (partnerId, reg, data) => (await prisma.vehicle.findUnique({ where: { registrationNumber: reg } })) || prisma.vehicle.create({ data: { partnerId, registrationNumber: reg, ...data } });
  const innova = await veh(taxi.id, 'AS02AB1234', { vehicleClass: 'muv', make: 'Toyota', model: 'Innova Crysta', year: 2021, color: 'White', seats: 7, fuelType: 'diesel', hasAc: true, forTrips: true, verificationStatus: 'approved', verifiedAt: new Date() });
  await veh(taxi.id, 'AS02CD5678', { vehicleClass: 'sedan', make: 'Maruti', model: 'Dzire', year: 2022, seats: 4, fuelType: 'cng', hasAc: true, forTrips: true, verificationStatus: 'pending' });
  await veh(rental.id, 'AS01RR1111', { vehicleClass: 'suv', make: 'Mahindra', model: 'Scorpio N', year: 2023, seats: 7, fuelType: 'diesel', hasAc: true, forRental: true, forTrips: false, verificationStatus: 'approved', verifiedAt: new Date(), rentalAvailable: true, rentalPricePerDay: 3500, rentalDriverOption: 'both', securityDeposit: 5000, rentalDistrict: 'Kamrup Metropolitan', rentalCity: 'Guwahati', rentalAddress: 'GS Road, Christian Basti', rentalLat: 26.1445, rentalLng: 91.7898 });
  await veh(rental.id, 'AS01RR2222', { vehicleClass: 'hatchback', make: 'Hyundai', model: 'i20', year: 2022, seats: 5, fuelType: 'petrol', hasAc: true, forRental: true, verificationStatus: 'approved', verifiedAt: new Date(), rentalAvailable: false, rentalPricePerDay: 1800, rentalPricePerHour: 200, rentalDriverOption: 'self_drive', rentalDistrict: 'Kamrup Metropolitan', rentalCity: 'Guwahati', rentalLat: 26.18, rentalLng: 91.75 });
  await veh(fleet.id, 'AS03TR9090', { vehicleClass: 'mini_truck', make: 'Tata', model: 'Ace Gold', year: 2020, loadCapacityKg: 750, fuelType: 'diesel', forGoods: true, forTrips: false, verificationStatus: 'pending' });

  if (!(await prisma.trip.findFirst({ where: { partnerId: taxi.id } }))) {
    const stops = [
      ['Nagaon', 'Nagaon', 0],
      ['Jagiroad', 'Morigaon', 150],
      ['Sonapur', 'Kamrup Metropolitan', 250],
      ['Guwahati ISBT', 'Kamrup Metropolitan', 350],
    ];
    const out = await prisma.trip.create({
      data: { partnerId: taxi.id, vehicleId: innova.id, tripType: 'start', originName: 'Nagaon', destinationName: 'Guwahati ISBT', departureAt: hours(20), totalSeats: 6, availableSeats: 4, pricePerSeat: 350, notes: 'AC, one bag per person', stops: { create: stops.map(([n, d, f], i) => ({ seq: i, placeName: n, placeKey: key(n), district: d, fareFromStart: f })) } },
    });
    const back = await prisma.trip.create({
      data: { partnerId: taxi.id, vehicleId: innova.id, tripType: 'return', parentTripId: out.id, originName: 'Guwahati ISBT', destinationName: 'Nagaon', departureAt: hours(30), totalSeats: 6, availableSeats: 6, pricePerSeat: 350, stops: { create: [...stops].reverse().map(([n, d, f], i) => ({ seq: i, placeName: n, placeKey: key(n), district: d, fareFromStart: i === 0 ? 0 : 350 - f })) } },
    });
    const names = (trip) => (trip.tripType === 'return' ? [...stops].reverse() : stops).map((x) => x[0]);
    const mk = (user, trip, seats, p, dr, status, fare) => prisma.booking.create({ data: { code: `GTDEMO${user.id}${trip.id}`, tripId: trip.id, userId: user.id, partnerId: taxi.id, seats, pickupSeq: p, dropSeq: dr, pickupName: names(trip)[p], dropName: names(trip)[dr], fareEstimate: fare, passengerName: user.fullName, passengerPhone: user.phone, status, ...(status !== 'pending' ? { respondedAt: new Date() } : {}) } });
    await mk(customers[0], out, 2, 0, 3, 'accepted', 700);
    await mk(customers[1], out, 1, 1, 3, 'pending', 200);
    await mk(customers[2], back, 2, 0, 3, 'pending', 700);
  }

  await prisma.supportTicket.create({ data: { userId: customers[3].id, app: 'user', category: 'booking', subject: 'Driver not reachable', message: 'I booked a seat but the driver phone is switched off. Please help.' } });
  console.log('Demo data ready. Partner logins (OTP shown in API log in dev): +919100000001 … +919100000005; customers +919000000000 … +919000000003');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
