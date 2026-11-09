// Clean, realistic data for Play Store screenshots (database gotrip_store only).
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKEND = path.join(ROOT, 'GoTrips_backend');
const WORK = path.join(__dirname, '../build');
const fs = require('fs');
const { PrismaClient } = require(path.join(BACKEND, 'node_modules/@prisma/client'));
const makeCar = require('./cars');
const prisma = new PrismaClient();

const key = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
// A time in India: dayOffset from today, at hh:mm IST.
function ist(dayOffset, hh, mm = 0) {
  const now = new Date(Date.now() + 5.5 * 3600_000);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hh, mm) - 5.5 * 3600_000);
  return d;
}
const daysAgo = (n, h = 10) => ist(-n, h);
const UP = path.join(BACKEND, 'uploads');

async function photo(name, kind, color, sky) {
  const keyName = `store/${name}.jpg`;
  fs.mkdirSync(path.join(UP, 'store'), { recursive: true });
  await makeCar(path.join(UP, keyName), kind, color, sky);
  return keyName;
}

async function user(phone, fullName, extra = {}) {
  return prisma.user.create({ data: { phone: `+91${phone}`, fullName, city: extra.city || 'Guwahati', language: 'en', ...extra } });
}

async function partner(phone, name, code, extra = {}) {
  const category = await prisma.partnerCategory.findUnique({ where: { code }, include: { requirements: true } });
  const u = await user(phone, name, { city: extra.city || 'Nagaon' });
  const p = await prisma.partner.create({
    data: {
      userId: u.id,
      categoryId: category.id,
      district: extra.district || 'Nagaon',
      city: extra.city || 'Nagaon',
      businessName: extra.businessName,
      whatsappPhone: u.phone,
      accountStatus: 'active',
      verificationStatus: 'approved',
      activatedAt: daysAgo(120),
      submittedAt: daysAgo(121),
      verifiedAt: daysAgo(120),
      createdAt: daysAgo(121),
      ...(category.registrationFee ? { feePaidAt: daysAgo(120), listingExpiresAt: ist(245, 12) } : {}),
    },
  });
  for (const r of category.requirements.filter((x) => x.scope === 'partner' && x.isRequired))
    await prisma.partnerDocument.create({ data: { partnerId: p.id, docType: r.docType, frontKey: 'store/doc.jpg', docNumber: r.requiresNumber ? 'AS0120150012345' : null, expiryDate: r.requiresExpiry ? ist(900, 12) : null, status: 'approved', reviewedAt: daysAgo(120) } });
  if (category.registrationFee)
    await prisma.payment.create({ data: { userId: u.id, partnerId: p.id, amount: category.registrationFee, status: 'paid', receipt: `GT-RCPT-${p.id}`, razorpayOrderId: `order_ST${p.id}`, razorpayPaymentId: `pay_ST${p.id}`, method: 'upi', paidAt: daysAgo(120), validUntil: ist(245, 12), categoryCode: code } });
  return { ...p, user: u };
}

async function vehicle(partnerId, reg, data, img) {
  const photoKeys = img ? [await photo(reg, ...img)] : [];
  const v = await prisma.vehicle.create({ data: { partnerId, registrationNumber: reg, verificationStatus: 'approved', verifiedAt: daysAgo(100), photoKeys, ...data } });
  for (const docType of ['vehicle_rc', 'insurance']) await prisma.vehicleDocument.create({ data: { vehicleId: v.id, docType, frontKey: 'store/doc.jpg', expiryDate: docType === 'insurance' ? ist(300, 12) : null, status: 'approved', reviewedAt: daysAgo(100) } }).catch(() => {});
  return v;
}

async function trip(p, v, stops, departureAt, extra = {}) {
  const price = stops[stops.length - 1][2];
  return prisma.trip.create({
    data: {
      partnerId: p.id,
      vehicleId: v.id,
      tripType: extra.tripType || 'start',
      parentTripId: extra.parentTripId || null,
      originName: stops[0][0],
      destinationName: stops[stops.length - 1][0],
      departureAt,
      arrivalAt: extra.arrivalAt || new Date(departureAt.getTime() + (extra.hours || 3) * 3600_000),
      totalSeats: extra.seats || 6,
      availableSeats: extra.available ?? extra.seats ?? 6,
      pricePerSeat: price,
      acceptsParcels: !!extra.parcels,
      notes: extra.notes,
      status: extra.status || 'scheduled',
      startedAt: extra.status === 'completed' ? departureAt : null,
      completedAt: extra.status === 'completed' ? new Date(departureAt.getTime() + 3 * 3600_000) : null,
      bookingOpen: (extra.status || 'scheduled') === 'scheduled',
      createdAt: extra.createdAt || new Date(departureAt.getTime() - 2 * 86400_000),
      stops: { create: stops.map(([n, d, f], i) => ({ seq: i, placeName: n, placeKey: key(n), district: d, fareFromStart: i === 0 ? 0 : f })) },
    },
  });
}

let codeSeq = 1000;
async function booking(u, t, p, seats, pickupSeq, dropSeq, status, stops, extra = {}) {
  const fare = (stops[dropSeq][2] - stops[pickupSeq][2]) * seats;
  return prisma.booking.create({
    data: {
      code: `GT${(codeSeq++).toString(36).toUpperCase()}K${seats}${pickupSeq}`,
      tripId: t.id,
      userId: u.id,
      partnerId: p.id,
      seats,
      pickupSeq,
      dropSeq,
      pickupName: stops[pickupSeq][0],
      dropName: stops[dropSeq][0],
      fareEstimate: fare,
      passengerName: u.fullName,
      passengerPhone: u.phone,
      note: extra.note,
      status,
      respondedAt: status !== 'pending' ? new Date(t.departureAt.getTime() - 86400_000) : null,
      completedAt: status === 'completed' ? new Date(t.departureAt.getTime() + 3 * 3600_000) : null,
      createdAt: extra.createdAt || new Date(Math.min(Date.now() - 20 * 60_000, t.departureAt.getTime() - 30 * 3600_000)),
    },
  });
}

async function review(p, u, rating, comment, b, ago) {
  await prisma.review.create({ data: { partnerId: p.id, userId: u.id, bookingId: b?.id || null, rating, comment, createdAt: daysAgo(ago) } });
}
async function refresh(p) {
  const [agg] = await prisma.$queryRaw`SELECT COALESCE(AVG(rating),0)::float avg, COUNT(*)::int c FROM reviews WHERE partner_id=${p.id}`;
  await prisma.partner.update({ where: { id: p.id }, data: { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.c } });
}

process.chdir(BACKEND);
(async () => {
  fs.mkdirSync(path.join(UP, 'store'), { recursive: true });
  await require(path.join(BACKEND, 'node_modules/sharp'))({ create: { width: 600, height: 400, channels: 3, background: '#e5e7eb' } }).jpeg().toFile(path.join(UP, 'store/doc.jpg'));

  // ---------- customers ----------
  const ananya = await user('9000000001', 'Ananya Bora');
  const others = [];
  for (const [i, n] of ['Rahul Kalita', 'Priya Saikia', 'Dipankar Nath', 'Mitali Das', 'Jintu Gogoi', 'Nayanmoni Sharma', 'Kaushik Baruah', 'Rimpi Begum', 'Abhijit Medhi', 'Pallavi Dutta'].entries()) others.push(await user(`90000001${String(i).padStart(2, '0')}`, n));

  // ---------- trip partners ----------
  const NG = [['Nagaon', 'Nagaon', 0], ['Jagiroad', 'Morigaon', 150], ['Sonapur', 'Kamrup Metropolitan', 250], ['Guwahati ISBT', 'Kamrup Metropolitan', 350]];
  const NG_BACK = [...NG].reverse().map(([n, d, f], i) => [n, d, i === 0 ? 0 : 350 - f]);
  const TZ = [['Tezpur', 'Sonitpur', 0], ['Dhekiajuli', 'Sonitpur', 120], ['Mangaldoi', 'Darrang', 250], ['Guwahati', 'Kamrup Metropolitan', 450]];
  const JR = [['Jorhat', 'Jorhat', 0], ['Golaghat', 'Golaghat', 150], ['Bokakhat', 'Golaghat', 250], ['Nagaon', 'Nagaon', 450], ['Guwahati', 'Kamrup Metropolitan', 650]];
  const NG2 = [['Nagaon', 'Nagaon', 0], ['Guwahati ISBT', 'Kamrup Metropolitan', 300]];
  const GS = [['Guwahati', 'Kamrup Metropolitan', 0], ['Jorabat', 'Kamrup Metropolitan', 100], ['Shillong', 'East Khasi Hills', 400]];

  const rupam = await partner('9100000003', 'Rupam Das', 'taxi', { district: 'Nagaon', city: 'Nagaon' });
  const innova = await vehicle(rupam.id, 'AS02AB1234', { vehicleClass: 'muv', make: 'Toyota', model: 'Innova Crysta', year: 2021, color: 'White', seats: 7, fuelType: 'diesel', hasAc: true, forTrips: true, isAvailable: true }, ['suv', '#f8fafc']);
  const dzireR = await vehicle(rupam.id, 'AS02CD5678', { vehicleClass: 'sedan', make: 'Maruti', model: 'Dzire', year: 2022, color: 'Silver', seats: 4, fuelType: 'cng', hasAc: true, forTrips: true, isAvailable: false }, ['sedan', '#cbd5e1']);
  await vehicle(rupam.id, 'AS02EF9012', { vehicleClass: 'van', make: 'Force', model: 'Traveller', year: 2023, color: 'White', seats: 12, fuelType: 'diesel', hasAc: true, forTrips: true, verificationStatus: 'pending', verifiedAt: null }, ['van', '#f1f5f9']);

  const pranjal = await partner('9100000006', 'Pranjal Bora', 'taxi', { district: 'Nagaon', city: 'Nagaon' });
  const swift = await vehicle(pranjal.id, 'AS02GH3344', { vehicleClass: 'sedan', make: 'Maruti', model: 'Swift Dzire', year: 2022, color: 'Red', seats: 4, fuelType: 'petrol', hasAc: true, forTrips: true }, ['sedan', '#ef4444']);
  const jyoti = await partner('9100000007', 'Jyotirmoy Hazarika', 'taxi', { district: 'Sonitpur', city: 'Tezpur' });
  const ertiga = await vehicle(jyoti.id, 'AS12JK7788', { vehicleClass: 'muv', make: 'Maruti', model: 'Ertiga', year: 2023, color: 'Blue', seats: 6, fuelType: 'cng', hasAc: true, forTrips: true }, ['suv', '#2563eb']);
  const bhaskar = await partner('9100000008', 'Bhaskar Gogoi', 'taxi', { district: 'Jorhat', city: 'Jorhat' });
  const xuv = await vehicle(bhaskar.id, 'AS03LM5566', { vehicleClass: 'suv', make: 'Mahindra', model: 'XUV700', year: 2023, color: 'Black', seats: 6, fuelType: 'diesel', hasAc: true, forTrips: true }, ['suv', '#111827']);

  // Upcoming trips (tomorrow and the day after) — what passengers see in search.
  const t1 = await trip(rupam, innova, NG, ist(1, 7, 30), { seats: 6, available: 3, notes: 'AC car, one bag per person. Pickup near Nagaon bus stand.', parcels: true });
  const t1b = await trip(rupam, innova, NG_BACK, ist(1, 17, 0), { tripType: 'return', parentTripId: t1.id, seats: 6, available: 6 });
  await trip(rupam, innova, NG, ist(2, 7, 30), { seats: 6, available: 6, notes: 'AC car, one bag per person. Pickup near Nagaon bus stand.' });
  await trip(pranjal, swift, NG2, ist(1, 9, 15), { seats: 4, available: 2, hours: 2.5 });
  await trip(pranjal, swift, [...NG2].reverse().map(([n, d, f], i) => [n, d, i ? 300 : 0]), ist(1, 18, 30), { tripType: 'return', seats: 4, available: 4, hours: 2.5 });
  await trip(jyoti, ertiga, TZ, ist(1, 8, 0), { seats: 5, available: 4, hours: 4 });
  await trip(bhaskar, xuv, JR, ist(1, 6, 0), { seats: 5, available: 2, hours: 7 });
  await trip(bhaskar, xuv, GS, ist(2, 10, 0), { seats: 5, available: 5, hours: 3.5 });

  // Bookings on Rupam's trip tomorrow: Ananya confirmed, two new requests waiting.
  const bA = await booking(ananya, t1, rupam, 2, 1, 3, 'accepted', NG);
  await booking(others[0], t1, rupam, 1, 0, 3, 'accepted', NG);
  await booking(others[1], t1, rupam, 2, 0, 3, 'pending', NG, { note: 'Two of us with one small bag. Please wait 5 min at Nagaon.', createdAt: new Date(Date.now() - 12 * 60_000) });
  await booking(others[2], t1b, rupam, 1, 0, 2, 'pending', NG_BACK, { createdAt: new Date(Date.now() - 45 * 60_000) });

  // History: completed trips over the last 4 weeks (earnings + reviews).
  const comments = [
    [5, 'Very safe driving and left exactly on time. Clean AC car.'],
    [5, 'Polite driver, helped with luggage. Will book again.'],
    [4, 'Comfortable ride, a small delay at Jagiroad.'],
    [5, 'Best way to reach Guwahati from Nagaon. Cheaper than a taxi.'],
    [5, 'Driver called before pickup and waited for us.'],
    [4, 'Good experience overall.'],
  ];
  let past = [];
  for (const [i, ago] of [3, 6, 9, 13, 17, 20, 24, 27].entries()) {
    const t = await trip(rupam, innova, i % 2 ? NG_BACK : NG, ist(-ago, i % 2 ? 17 : 7, 30), { status: 'completed', seats: 6, available: 6 - (2 + (i % 3)), createdAt: daysAgo(ago + 2) });
    const stops = i % 2 ? NG_BACK : NG;
    const u1 = others[(i * 2) % others.length];
    const u2 = others[(i * 2 + 1) % others.length];
    const b1 = await booking(u1, t, rupam, 1 + (i % 2), 0, stops.length - 1, 'completed', stops, { createdAt: daysAgo(ago + 1) });
    const b2 = await booking(u2, t, rupam, 1 + (i % 3 === 0 ? 1 : 0), 1, stops.length - 1, 'completed', stops, { createdAt: daysAgo(ago + 1) });
    past.push([t, b1, b2, u1, u2, ago]);
  }
  // Ananya's completed trip last week (she can rate it in the app)
  const tA = past[1][0];
  await booking(ananya, tA, rupam, 1, 0, 3, 'completed', NG_BACK, { createdAt: daysAgo(7) });
  for (const [i, [, b1, , u1, , ago]] of past.slice(0, 6).entries()) await review(rupam, u1, comments[i][0], comments[i][1], b1, ago - 1);
  await refresh(rupam);
  for (const [p, rs] of [[pranjal, [5, 4, 5, 5]], [jyoti, [5, 5, 5, 4, 5]], [bhaskar, [5, 4, 4]]]) {
    for (const [i, r] of rs.entries()) {
      const t = await trip(p, p === pranjal ? swift : p === jyoti ? ertiga : xuv, p === pranjal ? NG2 : p === jyoti ? TZ : JR, ist(-(5 + i * 4), 8), { status: 'completed' });
      const stops = p === pranjal ? NG2 : p === jyoti ? TZ : JR;
      const b = await booking(others[(i + 3) % others.length], t, p, 1, 0, stops.length - 1, 'completed', stops);
      await review(p, others[(i + 3) % others.length], r, i === 0 ? 'On time and very friendly.' : null, b, 4 + i * 4);
    }
    await refresh(p);
  }

  // Rupam is sharing live location for tomorrow's trip (shows on Ananya's confirmed booking).
  await prisma.locationShare.create({ data: { partnerId: rupam.id, isSharing: true, lat: 26.3464, lng: 92.684, accuracyM: 12, tripId: t1.id, startedAt: new Date(Date.now() - 20 * 60_000), expiresAt: new Date(Date.now() + 4 * 3600_000) } });

  // ---------- rentals ----------
  const hills = await partner('9100000004', 'Hills Car Rentals', 'rental', { district: 'Kamrup Metropolitan', city: 'Guwahati', businessName: 'Hills Car Rentals' });
  const R = { forRental: true, forTrips: false, rentalDistrict: 'Kamrup Metropolitan', rentalCity: 'Guwahati', rentalAddress: 'GS Road, Christian Basti', rentalLat: 26.1445, rentalLng: 91.7898, rentalTerms: 'Driving licence and Aadhaar needed for self-drive.\nFuel at actuals. Return with the same fuel level.\nOutstation trips: driver food and night stay extra.' };
  await vehicle(hills.id, 'AS01RR1111', { vehicleClass: 'suv', make: 'Mahindra', model: 'Scorpio N', year: 2023, color: 'Black', seats: 7, fuelType: 'diesel', hasAc: true, rentalAvailable: true, rentalPricePerDay: 3500, rentalDriverOption: 'both', securityDeposit: 5000, description: 'Spacious 7-seater, perfect for Shillong and Kaziranga trips.', features: ['music_system', 'gps', 'first_aid'], ...R }, ['suv', '#111827']);
  await vehicle(hills.id, 'AS01RR3333', { vehicleClass: 'van', make: 'Force', model: 'Traveller 12-seater', year: 2022, color: 'White', seats: 12, fuelType: 'diesel', hasAc: true, rentalAvailable: true, rentalPricePerDay: 5500, rentalDriverOption: 'with_driver', ...R }, ['van', '#f8fafc']);
  await vehicle(hills.id, 'AS01RR2222', { vehicleClass: 'hatchback', make: 'Hyundai', model: 'i20', year: 2022, color: 'Orange', seats: 5, fuelType: 'petrol', hasAc: true, rentalAvailable: true, rentalPricePerDay: 1800, rentalPricePerHour: 200, rentalMinHours: 4, rentalDriverOption: 'self_drive', securityDeposit: 3000, ...R, rentalAddress: 'Zoo Road Tiniali' }, ['hatch', '#f59e0b']);
  const brahma = await partner('9100000009', 'Brahmaputra Travels', 'rental', { district: 'Kamrup Metropolitan', city: 'Guwahati', businessName: 'Brahmaputra Travels' });
  await vehicle(brahma.id, 'AS01BT4545', { vehicleClass: 'bus', make: 'Tata', model: 'Starbus 32-seater', year: 2021, color: 'Blue', seats: 32, fuelType: 'diesel', hasAc: true, rentalAvailable: true, rentalPricePerDay: 12000, rentalDriverOption: 'with_driver', ...R, rentalAddress: 'Paltan Bazar' }, ['bus', '#2563eb']);
  await vehicle(brahma.id, 'AS01BT7777', { vehicleClass: 'sedan', make: 'Honda', model: 'City', year: 2022, color: 'Red', seats: 5, fuelType: 'petrol', hasAc: true, rentalAvailable: false, rentalPricePerDay: 2500, rentalDriverOption: 'both', ...R, rentalAddress: 'Paltan Bazar' }, ['sedan', '#dc2626']);
  for (const [i, r] of [5, 5, 4, 5].entries()) await review(hills, others[i + 4], r, i === 0 ? 'Car was clean and the owner was very helpful.' : null, null, 6 + i * 5);
  await refresh(hills);

  // ---------- marketplace drivers ----------
  const drivers = [
    ['9100000001', 'Bikash Deka', 'Kamrup Metropolitan', 'Guwahati', 'Outstation and airport trips', 'Safe, punctual and polite. I know the roads to Shillong, Tawang and Kaziranga well. Available for family trips and corporate duty.', 8, ['car', 'suv', 'tempo_traveller'], ['outstation', 'airport', 'personal'], 'full_time', 900, 1300, [5, 5, 5, 4, 5]],
    ['9100000002', 'Mridul Hazarika', 'Nagaon', 'Nagaon', 'Daily office and local driving', 'Experienced with automatic cars. Can drive your car for office, school runs and local errands.', 4, ['car'], ['personal', 'local'], 'part_time', 600, 800, [5, 4, 5]],
    ['9100000010', 'Ranjit Kalita', 'Jorhat', 'Jorhat', 'Heavy and commercial vehicle driver', 'Twelve years driving trucks and buses across the North East. Holds a commercial licence.', 12, ['bus', 'truck', 'suv'], ['commercial', 'outstation'], 'full_time', 1000, 1500, [5, 5, 4]],
    ['9100000011', 'Dhruba Saikia', 'Kamrup Metropolitan', 'Guwahati', 'Airport pick-up and drop', 'Night and early morning airport runs. Always on time.', 5, ['car', 'suv'], ['airport', 'local'], 'on_call', 500, 700, [4, 5]],
  ];
  for (const [phone, name, district, city, headline, bio, yrs, vt, wt, av, min, max, rates] of drivers) {
    const p = await partner(phone, name, 'driver', { district, city });
    await prisma.driverProfile.create({
      data: { partnerId: p.id, headline, bio, hasPriorExperience: true, experienceYears: yrs, experienceDetails: yrs > 6 ? 'Worked with travel agencies and private families' : 'Personal driver for a family in Guwahati', licenseNumber: 'AS0120150012345', licenseTypes: yrs > 10 ? ['LMV', 'HMV', 'TRANS'] : ['LMV', 'TRANS'], licenseExpiry: ist(1000, 12), vehicleTypes: vt, canDriveAutomatic: true, languages: ['Assamese', 'Hindi', 'English'], serviceAreas: [city, 'Nagaon', 'Shillong'].filter((x, i, a) => a.indexOf(x) === i), workTypes: wt, availability: av, expectedPayMin: min, expectedPayMax: max, payUnit: 'per_day', education: 'Class 12', hasOwnVehicle: false, district, city, isAvailable: true, isListed: true, listedAt: daysAgo(100), completeness: 100, viewCount: 120 + yrs * 23, callCount: 18 + yrs * 3 },
    });
    const rv = ['Drove us to Shillong and back safely. Very patient on hill roads.', 'Punctual and well behaved. Highly recommended.', 'Good driver, knows the city well.'];
    for (const [i, r] of rates.entries()) {
      const u = others[(i + drivers.findIndex((d) => d[0] === phone)) % others.length];
      await prisma.contactEvent.create({ data: { partnerId: p.id, userId: u.id, targetType: 'driver_profile', targetId: 0, channel: 'call', createdAt: daysAgo(10 + i * 6) } });
      await review(p, u, r, i < rv.length && i < 2 ? rv[i] : null, null, 8 + i * 6);
    }
    await refresh(p);
    for (let i = 0; i < 14; i++) await prisma.contactEvent.create({ data: { partnerId: p.id, userId: others[i % others.length].id, targetType: 'driver_profile', targetId: 0, channel: i % 3 ? 'call' : 'whatsapp', createdAt: daysAgo(i * 2) } });
  }

  // Notifications in the inbox (partner + user)
  const N = (userId, app, type, title, body, mins, data = {}) => prisma.notification.create({ data: { userId, app, type, title, body, data, createdAt: new Date(Date.now() - mins * 60_000) } });
  await N(rupam.user.id, 'partner', 'booking_request', 'New booking request', 'Priya Saikia wants 2 seat(s) Nagaon → Guwahati ISBT tomorrow 7:30 am.', 12);
  await N(rupam.user.id, 'partner', 'new_review', 'New rating: ★★★★★', 'A customer rated you 5 out of 5. Open Ratings & reviews to read it.', 60 * 26);
  await N(rupam.user.id, 'partner', 'vehicle_approved', 'Vehicle approved ✅', 'Toyota Innova Crysta (AS02AB1234) is verified and now visible to customers.', 60 * 24 * 90);
  await N(ananya.id, 'user', 'booking_accepted', 'Booking confirmed 🎉', 'Your 2 seat(s) Jagiroad → Guwahati ISBT tomorrow at 7:30 am are confirmed. You can call the driver from the app.', 30);
  await N(ananya.id, 'user', 'trip_started', 'Your trip has started', 'The vehicle for Guwahati ISBT → Nagaon is on its way.', 60 * 24 * 6);

  console.log('store data ready', { ananya: ananya.phone, rupam: rupam.user.phone, t1: t1.id, bookingAnanya: bA.id, tripAnanyaCompleted: tA.id });
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
