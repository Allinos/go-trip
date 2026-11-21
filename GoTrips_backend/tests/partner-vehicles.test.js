const { api, login, auth, image, adminToken, activePartner, prisma } = require('./helpers');

afterAll(() => prisma.$disconnect());

const reg = () => `AS${10 + Math.floor(Math.random() * 89)}C${1000 + Math.floor(Math.random() * 9000)}`;
const P = '/api/v1/partner';

describe('Partner registration completes only on submit', () => {
  test('commercial owner: uploading Aadhaar does not open the dashboard; incomplete details block submit', async () => {
    const s = await login('partner');
    await api().patch('/api/v1/me').set(auth(s.token)).send({ fullName: 'Fleet Owner' });
    await api().post(`${P}/register`).set(auth(s.token)).send({ categoryCode: 'commercial', district: 'Nagaon', city: 'Nagaon' }).expect(201);
    let st = (await api().get(`${P}/onboarding`).set(auth(s.token))).body.data;
    expect(st.nextStep).toBe('details');
    expect(st.steps.find((x) => x.key === 'details').missing).toEqual(['address', 'pincode']);

    // Submitting early is refused
    const early = await api().post(`${P}/onboarding/submit`).set(auth(s.token));
    expect(early.status).toBe(400);
    expect(early.body.error.code).toBe('ONBOARDING_INCOMPLETE');

    await api().patch(`${P}/me`).set(auth(s.token)).send({ address: 'NH-37, Haibargaon', pincode: '782002' }).expect(200);
    const up = await api().post(`${P}/documents/aadhaar`).set(auth(s.token)).attach('front', await image(), 'f.png').attach('back', await image(), 'b.png');
    expect(up.status).toBe(200);
    expect(up.body.data.onboarding.completed).toBe(false);
    expect(up.body.data.onboarding.nextStep).toBe('review');
    // Still not allowed into the main app
    expect((await api().get(`${P}/dashboard`).set(auth(s.token))).status).toBe(403);

    st = (await api().post(`${P}/onboarding/submit`).set(auth(s.token)).expect(200)).body.data;
    expect(st.completed).toBe(true);
    expect(st.verificationStatus).toBe('pending');
    expect((await api().get(`${P}/dashboard`).set(auth(s.token))).status).toBe(200);
  });
});

describe('Vehicle categories', () => {
  let admin;
  beforeAll(async () => (admin = await adminToken()));

  test('passenger vehicles need seats, goods vehicles need load capacity; seats are dropped for goods', async () => {
    const s = await activePartner('commercial');
    const req = (await api().get(`${P}/vehicles/requirements`).set(auth(s.token))).body.data;
    expect(req.categories).toEqual(['passenger', 'commercial']);
    expect(req.classesByCategory.commercial).toContain('truck');

    const noLoad = await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'commercial', vehicleClass: 'truck', make: 'Tata', model: 'LPT 1109', registrationNumber: reg(), forGoods: true });
    expect(noLoad.status).toBe(400);
    const wrongType = await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'commercial', vehicleClass: 'sedan', make: 'Tata', model: 'X', registrationNumber: reg(), loadCapacityKg: 500 });
    expect(wrongType.status).toBe(400);

    const truck = await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'commercial', vehicleClass: 'truck', make: 'Tata', model: 'LPT 1109', registrationNumber: reg(), loadCapacityKg: 7000, bodyType: 'closed', cargoLengthFt: 19, seats: 3, hasAc: true, forTrips: true, forGoods: true });
    expect(truck.status).toBe(201);
    expect(truck.body.data).toMatchObject({ category: 'commercial', loadCapacityKg: 7000, bodyType: 'closed', seats: null, hasAc: false });

    const noSeats = await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'passenger', vehicleClass: 'bus', make: 'Tata', model: 'Starbus', registrationNumber: reg(), forTrips: true });
    expect(noSeats.status).toBe(400);
    const goodsCar = await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'passenger', vehicleClass: 'sedan', make: 'Maruti', model: 'Dzire', registrationNumber: reg(), seats: 4, forGoods: true });
    expect(goodsCar.status).toBe(400);
  });

  test('a taxi owner cannot add goods vehicles', async () => {
    const s = await activePartner('taxi');
    const r = await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'commercial', vehicleClass: 'pickup', make: 'Mahindra', model: 'Bolero Pickup', registrationNumber: reg(), loadCapacityKg: 1500 });
    expect(r.status).toBe(403);
  });

  test('approved vehicles of a rental partner can be used for trips; goods trips hire the whole vehicle', async () => {
    const s = await activePartner('commercial');
    const truck = (await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'commercial', vehicleClass: 'mini_truck', make: 'Tata', model: 'Ace Gold', registrationNumber: reg(), loadCapacityKg: 900, forTrips: true, forGoods: true })).body.data;
    // Not verified yet → no trips
    const stops = [{ placeName: 'Nagaon' }, { placeName: 'Jakhalabandha', fareFromStart: 900 }, { placeName: 'Jorhat' }];
    const body = { vehicleId: truck.id, departureAt: new Date(Date.now() + 86400_000).toISOString(), stops, pricePerSeat: 4500, capacityKg: 900 };
    expect((await api().post(`${P}/trips`).set(auth(s.token)).send(body)).body.error.code).toBe('VEHICLE_NOT_VERIFIED');
    await api().post(`/api/v1/admin/vehicles/${truck.id}/review`).set(auth(admin)).send({ decision: 'approve', ignoreMissingDocuments: true }).expect(200);

    const list = (await api().get(`${P}/vehicles`).query({ usage: 'trips' }).set(auth(s.token))).body.data;
    expect(list.map((v) => v.id)).toContain(truck.id);

    expect((await api().post(`${P}/trips`).set(auth(s.token)).send({ ...body, capacityKg: 2000 })).status).toBe(400);
    const trip = await api().post(`${P}/trips`).set(auth(s.token)).send(body);
    expect(trip.status).toBe(201);
    expect(trip.body.data).toMatchObject({ kind: 'goods', capacityKg: 900, totalSeats: 1, availableSeats: 1, acceptsParcels: false });
    expect(trip.body.data.stops[1].fareFromStart).toBeNull();

    // Default search shows every vehicle type; the passenger filter leaves it out, the goods filter keeps it
    const all = await api().get('/api/v1/trips/search').query({ from: 'Nagaon', to: 'Jorhat', seats: 3 });
    expect(all.body.data.find((t) => t.id === trip.body.data.id).isFull).toBe(false);
    const ps = await api().get('/api/v1/trips/search').query({ from: 'Nagaon', to: 'Jorhat', kind: 'passenger' });
    expect(ps.body.data.map((t) => t.id)).not.toContain(trip.body.data.id);
    const gs = await api().get('/api/v1/trips/search').query({ from: 'Nagaon', to: 'Jorhat', kind: 'goods' });
    expect(gs.body.data.map((t) => t.id)).toContain(trip.body.data.id);

    // Customer requests the vehicle for a load
    const u = await login('user');
    const missing = await api().post('/api/v1/bookings').set(auth(u.token)).send({ tripId: trip.body.data.id, seats: 1, pickupSeq: 0, dropSeq: 2 });
    expect(missing.body.error.code).toBe('GOODS_REQUIRED');
    const heavy = await api().post('/api/v1/bookings').set(auth(u.token)).send({ tripId: trip.body.data.id, seats: 1, pickupSeq: 0, dropSeq: 2, goodsType: 'Cement bags', loadKg: 1500 });
    expect(heavy.body.error.code).toBe('OVER_CAPACITY');
    const ok = await api().post('/api/v1/bookings').set(auth(u.token)).send({ tripId: trip.body.data.id, seats: 3, pickupSeq: 0, dropSeq: 2, goodsType: 'Cement bags', loadKg: 800 });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ seats: 1, goodsType: 'Cement bags', loadKg: 800, fareEstimate: 4500 });
    await api().post(`${P}/bookings/${ok.body.data.id}/accept`).set(auth(s.token)).expect(200);
    const after = (await api().get(`${P}/trips/${trip.body.data.id}`).set(auth(s.token))).body.data;
    expect(after.availableSeats).toBe(0);
    expect(after.bookings[0]).toMatchObject({ goodsType: 'Cement bags', loadKg: 800 });
  });

  test('vehicle type change moves the category and re-sends for verification', async () => {
    const s = await activePartner('rental');
    const v = (await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'passenger', vehicleClass: 'suv', make: 'Mahindra', model: 'Scorpio', registrationNumber: reg(), seats: 6, forTrips: true })).body.data;
    expect(v.forTrips).toBe(true);
    await api().post(`/api/v1/admin/vehicles/${v.id}/review`).set(auth(admin)).send({ decision: 'approve', ignoreMissingDocuments: true }).expect(200);
    const bad = await api().patch(`${P}/vehicles/${v.id}`).set(auth(s.token)).send({ vehicleClass: 'pickup' });
    expect(bad.status).toBe(400); // goods vehicle needs a load capacity
    const ok = await api().patch(`${P}/vehicles/${v.id}`).set(auth(s.token)).send({ vehicleClass: 'pickup', loadCapacityKg: 1200 });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ category: 'commercial', seats: null, verificationStatus: 'pending' });
    expect(ok.body.meta.resubmitted).toBe(true);
  });
});

describe('Admin vehicle approval', () => {
  test('approval needs the required documents unless the admin overrides it', async () => {
    const admin = await adminToken();
    const s = await activePartner('taxi');
    const v = (await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'passenger', vehicleClass: 'sedan', make: 'Maruti Suzuki', model: 'Dzire', registrationNumber: reg(), seats: 4, forTrips: true })).body.data;
    const detail = (await api().get(`/api/v1/admin/vehicles/${v.id}`).set(auth(admin))).body.data;
    expect(detail.missingDocuments).toEqual(['Registration Certificate (RC)', 'Insurance']);
    const r = await api().post(`/api/v1/admin/vehicles/${v.id}/review`).set(auth(admin)).send({ decision: 'approve' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('DOCUMENTS_MISSING');
    await api().post(`${P}/vehicles/${v.id}/documents/rc`).set(auth(s.token)).attach('front', await image(), 'f.png').attach('back', await image(), 'b.png').field('docNumber', 'RC1').expect(200);
    await api().post(`${P}/vehicles/${v.id}/documents/insurance`).set(auth(s.token)).attach('front', await image(), 'f.png').field('docNumber', 'IN1').field('expiryDate', '2031-01-01').expect(200);
    await api().post(`/api/v1/admin/vehicles/${v.id}/review`).set(auth(admin)).send({ decision: 'approve' }).expect(200);
  });
});

describe('Predefined places', () => {
  test('trips can only use places from the list; names come from the list', async () => {
    const admin = await adminToken();
    const s = await activePartner('taxi');
    const v = (await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'passenger', vehicleClass: 'suv', make: 'Toyota', model: 'Innova', registrationNumber: reg(), seats: 6, forTrips: true })).body.data;
    await api().post(`/api/v1/admin/vehicles/${v.id}/review`).set(auth(admin)).send({ decision: 'approve', ignoreMissingDocuments: true }).expect(200);
    const base = { vehicleId: v.id, departureAt: new Date(Date.now() + 5 * 86400_000).toISOString(), totalSeats: 4, pricePerSeat: 500 };
    const bad = await api().post(`${P}/trips`).set(auth(s.token)).send({ ...base, stops: [{ placeName: 'Nagaon' }, { placeName: 'My Village Road' }] });
    expect(bad.body.error.code).toBe('UNKNOWN_PLACE');
    const districts = (await api().get('/api/v1/locations/districts')).body.data;
    const shillong = districts.find((d) => d.name === 'East Khasi Hills').places.find((p) => p.name === 'Shillong');
    const ok = await api().post(`${P}/trips`).set(auth(s.token)).send({ ...base, stops: [{ placeName: 'guwahati' }, { placeId: shillong.id, placeName: 'Typed differently' }] });
    expect(ok.status).toBe(201);
    expect(ok.body.data.stops.map((x) => [x.placeName, x.district])).toEqual([['Guwahati', 'Kamrup Metropolitan'], ['Shillong', 'East Khasi Hills']]);
  });

  test('drivers are not asked for police verification', async () => {
    const cats = (await api().get('/api/v1/config')).body.data.categories;
    const driver = cats.find((c) => c.code === 'driver');
    expect(JSON.stringify(driver)).not.toContain('police');
  });
});

describe('Driver contact on trips', () => {
  test('number and WhatsApp are hidden until the customer sends a booking request', async () => {
    const admin = await adminToken();
    const s = await activePartner('taxi');
    const v = (await api().post(`${P}/vehicles`).set(auth(s.token)).send({ category: 'passenger', vehicleClass: 'sedan', make: 'Maruti Suzuki', model: 'Dzire', registrationNumber: reg(), seats: 4, forTrips: true })).body.data;
    await api().post(`/api/v1/admin/vehicles/${v.id}/review`).set(auth(admin)).send({ decision: 'approve', ignoreMissingDocuments: true }).expect(200);
    const trip = (await api().post(`${P}/trips`).set(auth(s.token)).send({ vehicleId: v.id, departureAt: new Date(Date.now() + 3 * 86400_000).toISOString(), stops: [{ placeName: 'Tezpur' }, { placeName: 'Guwahati' }], totalSeats: 4, pricePerSeat: 400 })).body.data;
    const u = await login('user');
    const before = (await api().get(`/api/v1/trips/${trip.id}`).set(auth(u.token))).body.data;
    expect(before.driver.name).toBeTruthy();
    expect(before.vehicle.model).toBe('Dzire');
    expect(before.driver.phone).toBeNull();
    expect(before.driver.whatsappPhone).toBeNull();
    const denied = await api().post('/api/v1/marketplace/contact').set(auth(u.token)).send({ targetType: 'trip', targetId: trip.id });
    expect(denied.body.error.code).toBe('BOOK_FIRST');

    const b = await api().post('/api/v1/bookings').set(auth(u.token)).send({ tripId: trip.id, seats: 1, pickupSeq: 0, dropSeq: 1 });
    expect(b.status).toBe(201);
    const after = (await api().get(`/api/v1/trips/${trip.id}`).set(auth(u.token))).body.data;
    expect(after.driver.phone).toBe(s.phone);
    expect((await api().get(`/api/v1/bookings/${b.body.data.id}`).set(auth(u.token))).body.data.trip.driver.phone).toBe(s.phone);
    const ok = await api().post('/api/v1/marketplace/contact').set(auth(u.token)).send({ targetType: 'trip', targetId: trip.id, channel: 'whatsapp' });
    expect(ok.body.data.whatsappUrl).toContain('wa.me');
  });
});
