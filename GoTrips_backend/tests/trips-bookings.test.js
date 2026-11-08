const { api, login, auth, adminToken, activePartner, approvedVehicle, prisma, image } = require('./helpers');

afterAll(() => prisma.$disconnect());

const inHours = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const route = [
  { placeName: 'Nagaon', district: 'Nagaon', lat: 26.35, lng: 92.68 },
  { placeName: 'Jagiroad', district: 'Morigaon', fareFromStart: 150 },
  { placeName: 'Sonapur', fareFromStart: 250 },
  { placeName: 'Guwahati ISBT', district: 'Kamrup Metropolitan', lat: 26.12, lng: 91.73 },
];

describe('Vehicles, start/return trips, booking requests', () => {
  let admin, partner, vehicle, trip, returnTrip;

  beforeAll(async () => {
    admin = await adminToken();
    partner = await activePartner('taxi', { fullName: 'Rupam Taxi' });
  });

  test('a new vehicle is pending and cannot be used until admin approval', async () => {
    const v = await api().post('/api/v1/partner/vehicles').set(auth(partner.token)).send({ vehicleClass: 'sedan', make: 'Maruti', model: 'Dzire', registrationNumber: 'as 01 cd 4321', seats: 4, forTrips: true });
    expect(v.status).toBe(201);
    expect(v.body.data.verificationStatus).toBe('pending');
    expect(v.body.data.registrationNumber).toBe('AS01CD4321');
    const t = await api().post('/api/v1/partner/trips').set(auth(partner.token)).send({ vehicleId: v.body.data.id, departureAt: inHours(5), stops: route, totalSeats: 3, pricePerSeat: 350 });
    expect(t.status).toBe(400);
    expect(t.body.error.code).toBe('VEHICLE_NOT_VERIFIED');
    // duplicate registration number
    const dup = await api().post('/api/v1/partner/vehicles').set(auth(partner.token)).send({ vehicleClass: 'sedan', make: 'X', model: 'Y', registrationNumber: 'AS01CD4321', seats: 4 });
    expect(dup.status).toBe(409);
    // photo upload + rejection flow
    const ph = await api().post(`/api/v1/partner/vehicles/${v.body.data.id}/photos`).set(auth(partner.token)).attach('photos', await image(), 'p.png');
    expect(ph.body.data.photos).toHaveLength(1);
    const rej = await api().post(`/api/v1/admin/vehicles/${v.body.data.id}/review`).set(auth(admin)).send({ decision: 'reject' });
    expect(rej.status).toBe(400); // reason required
    await api().post(`/api/v1/admin/vehicles/${v.body.data.id}/review`).set(auth(admin)).send({ decision: 'reject', reason: 'RC photo unreadable' }).expect(200);
    const mine = await api().get(`/api/v1/partner/vehicles/${v.body.data.id}`).set(auth(partner.token));
    expect(mine.body.data.verificationStatus).toBe('rejected');
    expect(mine.body.data.rejectionReason).toBe('RC photo unreadable');
    // editing a rejected vehicle resubmits it
    const ed = await api().patch(`/api/v1/partner/vehicles/${v.body.data.id}`).set(auth(partner.token)).send({ color: 'White' });
    expect(ed.body.data.verificationStatus).toBe('pending');
  });

  test('partner creates a start trip and a one-tap return trip', async () => {
    vehicle = await approvedVehicle(partner.token, admin);
    const t = await api().post('/api/v1/partner/trips').set(auth(partner.token)).send({ vehicleId: vehicle.id, tripType: 'start', departureAt: inHours(6), stops: route, totalSeats: 4, pricePerSeat: 350, notes: 'AC car' });
    expect(t.status).toBe(201);
    trip = t.body.data;
    expect(trip.stops.map((s) => s.placeName)).toEqual(['Nagaon', 'Jagiroad', 'Sonapur', 'Guwahati ISBT']);
    expect(trip.availableSeats).toBe(4);

    const clash = await api().post('/api/v1/partner/trips').set(auth(partner.token)).send({ vehicleId: vehicle.id, departureAt: inHours(6.5), stops: route, totalSeats: 4, pricePerSeat: 350 });
    expect(clash.status).toBe(409);

    const tooEarly = await api().post(`/api/v1/partner/trips/${trip.id}/return-trip`).set(auth(partner.token)).send({ departureAt: inHours(1) });
    expect(tooEarly.status).toBe(400);
    const r = await api().post(`/api/v1/partner/trips/${trip.id}/return-trip`).set(auth(partner.token)).send({ departureAt: inHours(12) });
    expect(r.status).toBe(201);
    returnTrip = r.body.data;
    expect(returnTrip.tripType).toBe('return');
    expect(returnTrip.parentTripId).toBe(trip.id);
    expect(returnTrip.originName).toBe('Guwahati ISBT');
    expect(returnTrip.destinationName).toBe('Nagaon');
    expect(returnTrip.stops.find((s) => s.placeName === 'Jagiroad').fareFromStart).toBe(200);
  });

  test('users find trips from intermediate stops, in route order only', async () => {
    const s1 = await api().get('/api/v1/trips/search').query({ from: 'jagiroad', to: 'guwahati' });
    expect(s1.status).toBe(200);
    const hit = s1.body.data.find((t) => t.id === trip.id);
    expect(hit).toBeDefined();
    expect(hit.match.pickupName).toBe('Jagiroad');
    expect(hit.match.farePerSeat).toBe(200); // 350 - 150
    expect(hit.driver.phone).toBeNull(); // anonymous

    // Opposite direction finds the return trip, not the outbound one
    const s2 = await api().get('/api/v1/trips/search').query({ from: 'Guwahati', to: 'Nagaon' });
    expect(s2.body.data.map((t) => t.id)).toContain(returnTrip.id);
    expect(s2.body.data.map((t) => t.id)).not.toContain(trip.id);

    const s3 = await api().get('/api/v1/trips/search').query({ from: 'Nagaon', to: 'Guwahati', type: 'return' });
    expect(s3.body.data.map((t) => t.id)).not.toContain(trip.id);

    const s4 = await api().get('/api/v1/trips/search').query({ from: 'Nagaon', to: 'Guwahati', seats: 5 });
    expect(s4.body.data.map((t) => t.id)).not.toContain(trip.id);
  });

  test('booking request → partner accepts → seats reserved atomically → user cancels → seats released', async () => {
    const u1 = await login('user');
    const u2 = await login('user');
    const u3 = await login('user');

    const bad = await api().post('/api/v1/bookings').set(auth(u1.token)).send({ tripId: trip.id, seats: 1, pickupSeq: 2, dropSeq: 1 });
    expect(bad.status).toBe(400);

    const b1 = await api().post('/api/v1/bookings').set(auth(u1.token)).send({ tripId: trip.id, seats: 2, pickupSeq: 1, dropSeq: 3, passengerName: 'Mina' });
    expect(b1.status).toBe(201);
    expect(b1.body.data.status).toBe('pending');
    expect(b1.body.data.fareEstimate).toBe(400);
    const dup = await api().post('/api/v1/bookings').set(auth(u1.token)).send({ tripId: trip.id, seats: 1, pickupSeq: 0, dropSeq: 3 });
    expect(dup.status).toBe(409);

    const b2 = await api().post('/api/v1/bookings').set(auth(u2.token)).send({ tripId: trip.id, seats: 2, pickupSeq: 0, dropSeq: 3 });
    const b3 = await api().post('/api/v1/bookings').set(auth(u3.token)).send({ tripId: trip.id, seats: 2, pickupSeq: 0, dropSeq: 2 });
    expect(b3.status).toBe(201);

    // Partner sees requests + a notification was stored
    const list = await api().get('/api/v1/partner/bookings?status=pending').set(auth(partner.token));
    expect(list.body.data.length).toBeGreaterThanOrEqual(3);
    await new Promise((r) => setTimeout(r, 100));
    const notes = await api().get('/api/v1/me/notifications?app=partner').set(auth(partner.token));
    expect(notes.body.data.some((n) => n.type === 'booking_request')).toBe(true);

    // Accept three 2-seat requests concurrently on a 4-seat trip: exactly two succeed.
    const results = await Promise.all([b1, b2, b3].map((b) => api().post(`/api/v1/partner/bookings/${b.body.data.id}/accept`).set(auth(partner.token))));
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409)).toHaveLength(1);
    const t = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(t.availableSeats).toBe(0);

    // Full trip is no longer searchable
    const s = await api().get('/api/v1/trips/search').query({ from: 'Nagaon', to: 'Guwahati' });
    expect(s.body.data.map((x) => x.id)).not.toContain(trip.id);

    const accepted = results.findIndex((r) => r.status === 200);
    const users = [u1, u2, u3];
    const bookingIds = [b1, b2, b3].map((b) => b.body.data.id);
    const mine = await api().get(`/api/v1/bookings/${bookingIds[accepted]}`).set(auth(users[accepted].token));
    expect(mine.body.data.status).toBe('accepted');
    expect(mine.body.data.trip.driver.phone).toBe(partner.phone);

    const c = await api().post(`/api/v1/bookings/${bookingIds[accepted]}/cancel`).set(auth(users[accepted].token)).send({ reason: 'Plans changed' });
    expect(c.status).toBe(200);
    expect((await prisma.trip.findUnique({ where: { id: trip.id } })).availableSeats).toBe(2);

    // Other user cannot see or cancel someone else's booking
    const other = accepted === 0 ? 1 : 0;
    expect((await api().get(`/api/v1/bookings/${bookingIds[accepted]}`).set(auth(users[other].token))).status).toBe(404);
  });

  test('live location is shared only with accepted passengers and opens in Google Maps', async () => {
    const u = await login('user');
    const b = await api().post('/api/v1/bookings').set(auth(u.token)).send({ tripId: returnTrip.id, seats: 1, pickupSeq: 0, dropSeq: returnTrip.stops.length - 1 });
    await api().post('/api/v1/partner/location/start').set(auth(partner.token)).send({ tripId: returnTrip.id, hours: 2, lat: 26.14, lng: 91.79 }).expect(200);
    // pending booking: no location
    let loc = await api().get(`/api/v1/bookings/${b.body.data.id}/location`).set(auth(u.token));
    expect(loc.status).toBe(404);
    await api().post(`/api/v1/partner/bookings/${b.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    loc = await api().get(`/api/v1/bookings/${b.body.data.id}/location`).set(auth(u.token));
    expect(loc.body.data.mapsUrl).toBe('https://www.google.com/maps/search/?api=1&query=26.14,91.79');
    await api().post('/api/v1/partner/location/stop').set(auth(partner.token)).expect(200);
    loc = await api().get(`/api/v1/bookings/${b.body.data.id}/location`).set(auth(u.token));
    expect(loc.body.data).toBeNull();
  });

  test('cancelling a trip cancels its bookings and dashboard shows stats', async () => {
    const r = await api().post(`/api/v1/partner/trips/${returnTrip.id}/cancel`).set(auth(partner.token)).send({ reason: 'Vehicle breakdown' });
    expect(r.status).toBe(200);
    expect(r.body.meta.bookingsCancelled).toBe(1);
    const d = await api().get('/api/v1/partner/dashboard').set(auth(partner.token));
    expect(d.status).toBe(200);
    expect(d.body.data.vehicles.total).toBe(2);
    expect(d.body.data.vehicles.approved).toBe(1);
    expect(d.body.data.bookings.accepted).toBe(1);
    expect(d.body.data.earnings.upcomingEstimated).toBeGreaterThan(0);
    const e = await api().get('/api/v1/partner/earnings?period=month').set(auth(partner.token));
    expect(e.status).toBe(200);
    expect(e.body.data.summary.upcoming).toBeGreaterThan(0);
    expect(Array.isArray(e.body.data.series)).toBe(true);
  });

  test('a driver-type partner cannot list vehicles', async () => {
    const s = await login('partner');
    await api().patch('/api/v1/me').set(auth(s.token)).send({ fullName: 'Only Driver' });
    await api().post('/api/v1/partner/register').set(auth(s.token)).send({ categoryCode: 'driver', district: 'Nagaon', city: 'Nagaon' });
    const r = await api().get('/api/v1/partner/vehicles').set(auth(s.token));
    expect(r.status).toBe(403);
  });
});

describe('Rental marketplace', () => {
  test('approved rental vehicles appear by district with availability; OFF stays visible as unavailable', async () => {
    const admin = await adminToken();
    const p = await activePartner('rental', { fullName: 'Hills Rentals' });
    const noPrice = await api().post('/api/v1/partner/vehicles').set(auth(p.token)).send({ vehicleClass: 'suv', make: 'Mahindra', model: 'Scorpio', registrationNumber: 'AS01RR1111', seats: 7, forRental: true });
    expect(noPrice.status).toBe(400);
    const v = await approvedVehicle(p.token, admin, { forTrips: false, forRental: true, registrationNumber: 'AS01RR2222', rentalPricePerDay: 2500, rentalDriverOption: 'both', rentalDistrict: 'Kamrup Metropolitan', rentalCity: 'Guwahati', rentalLat: 26.14, rentalLng: 91.77 });
    let r = await api().get('/api/v1/rentals').query({ district: 'kamrup metropolitan' });
    let item = r.body.data.find((x) => x.id === v.id);
    expect(item.rental.available).toBe(true);
    expect(item.rental.pricePerDay).toBe(2500);
    expect(item.registrationNumber).not.toBe('AS01RR2222'); // masked publicly

    const near = await api().get('/api/v1/rentals').query({ lat: 26.15, lng: 91.78, radiusKm: 10 });
    expect(near.body.data.find((x) => x.id === v.id).distanceKm).toBeLessThan(5);

    await api().patch(`/api/v1/partner/vehicles/${v.id}/availability`).set(auth(p.token)).send({ rentalAvailable: false }).expect(200);
    r = await api().get('/api/v1/rentals').query({ district: 'Kamrup Metropolitan', page: 1, limit: 50 });
    item = r.body.data.find((x) => x.id === v.id);
    expect(item.rental.available).toBe(false);
    r = await api().get('/api/v1/rentals').query({ district: 'Kamrup Metropolitan', availableOnly: true });
    expect(r.body.data.find((x) => x.id === v.id)).toBeUndefined();

    // Pending vehicles never show up
    const pending = await api().post('/api/v1/partner/vehicles').set(auth(p.token)).send({ vehicleClass: 'hatchback', make: 'Hyundai', model: 'i10', registrationNumber: 'AS01RR3333', seats: 4, forRental: true, rentalPricePerDay: 1200, rentalDriverOption: 'self_drive', rentalDistrict: 'Kamrup Metropolitan' });
    r = await api().get('/api/v1/rentals').query({ district: 'Kamrup Metropolitan', limit: 50 });
    expect(r.body.data.find((x) => x.id === pending.body.data.id)).toBeUndefined();
  });
});

describe('Goods orders feature flag', () => {
  test('disabled by default, works after admin enables it', async () => {
    const u = await login('user');
    const body = { pickupName: 'Nagaon', dropName: 'Tezpur', goodsType: 'Furniture', weightKg: 300, pickupDate: inHours(30) };
    const off = await api().post('/api/v1/goods-orders').set(auth(u.token)).send(body);
    expect(off.status).toBe(403);
    expect(off.body.error.code).toBe('FEATURE_DISABLED');
    const cfg = await api().get('/api/v1/config');
    expect(cfg.body.data.features.goodsOrders).toBe(false);

    const support = await adminToken('support');
    expect((await api().patch('/api/v1/admin/settings').set(auth(support)).send({ goods_orders_enabled: true })).status).toBe(403);
    const sa = await adminToken('super_admin');
    await api().patch('/api/v1/admin/settings').set(auth(sa)).send({ goods_orders_enabled: true }).expect(200);

    expect((await api().post('/api/v1/goods-orders').set(auth(u.token)).send(body)).status).toBe(201);
    const fleet = await activePartner('commercial');
    const list = await api().get('/api/v1/partner/goods-orders').set(auth(fleet.token));
    expect(list.body.data.length).toBeGreaterThan(0);
    await api().patch('/api/v1/admin/settings').set(auth(sa)).send({ goods_orders_enabled: false }).expect(200);
  });
});
