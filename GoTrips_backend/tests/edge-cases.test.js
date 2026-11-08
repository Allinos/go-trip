// Edge cases found while testing as a partner and as a user (round 2).
const { api, login, auth, adminToken, activePartner, approvedVehicle, prisma } = require('./helpers');

afterAll(() => prisma.$disconnect());

const inHours = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const route = [
  { placeName: 'Tezpur', district: 'Sonitpur' },
  { placeName: 'Nagaon', district: 'Nagaon', fareFromStart: 200 },
  { placeName: 'Guwahati ISBT', district: 'Kamrup Metropolitan' },
];
const search = (q) => api().get('/api/v1/trips/search').query(q);

describe('Edge cases: bookings, trips and vehicles', () => {
  let admin, partner, user, user2, vehicle;
  const newTrip = async (h, body = {}) => {
    const r = await api()
      .post('/api/v1/partner/trips')
      .set(auth(partner.token))
      .send({ vehicleId: vehicle.id, departureAt: inHours(h), stops: route, totalSeats: 2, pricePerSeat: 400, ...body });
    if (r.status !== 201) throw new Error(JSON.stringify(r.body));
    return r.body.data;
  };
  const book = (u, trip, seats = 1) => api().post('/api/v1/bookings').set(auth(u.token)).send({ tripId: trip.id, seats, pickupSeq: 0, dropSeq: 2 });

  beforeAll(async () => {
    admin = await adminToken();
    partner = await activePartner('taxi', { fullName: 'Edge Partner' });
    user = await login('user');
    user2 = await login('user');
    vehicle = await approvedVehicle(partner.token, admin, { seats: 4 });
  });

  test('a user can request again after cancelling or being rejected', async () => {
    const trip = await newTrip(30);
    const b1 = await book(user, trip);
    expect(b1.status).toBe(201);
    expect((await book(user, trip)).status).toBe(409);
    await api().post(`/api/v1/bookings/${b1.body.data.id}/cancel`).set(auth(user.token)).send({}).expect(200);
    const b2 = await book(user, trip);
    expect(b2.status).toBe(201);
    await api().post(`/api/v1/partner/bookings/${b2.body.data.id}/reject`).set(auth(partner.token)).send({ reason: 'Full' }).expect(200);
    expect((await book(user, trip)).status).toBe(201);
  });

  test('a full trip leaves search and comes back when a seat frees up', async () => {
    const trip = await newTrip(40);
    const a = await book(user, trip, 1);
    const b = await book(user2, trip, 1);
    await search({ from: 'tezpur', to: 'guwahati' }); // warm the cache
    await api().post(`/api/v1/partner/bookings/${a.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    await api().post(`/api/v1/partner/bookings/${b.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    expect((await search({ from: 'tezpur', to: 'guwahati' })).body.data.map((t) => t.id)).not.toContain(trip.id);
    await api().post(`/api/v1/bookings/${a.body.data.id}/cancel`).set(auth(user.token)).send({}).expect(200);
    const back = (await search({ from: 'tezpur', to: 'guwahati' })).body.data.find((t) => t.id === trip.id);
    expect(back?.availableSeats).toBe(1);
  });

  test('accepting more seats than are left is refused and nothing is overbooked', async () => {
    const trip = await newTrip(50);
    const a = await book(user, trip, 2);
    const b = await book(user2, trip, 1);
    await api().post(`/api/v1/partner/bookings/${a.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    const r = await api().post(`/api/v1/partner/bookings/${b.body.data.id}/accept`).set(auth(partner.token));
    expect(r.status).toBe(409);
    const t = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(t.availableSeats).toBe(0);
  });

  test('a passenger cannot cancel once the trip has started', async () => {
    const trip = await newTrip(1);
    const a = await book(user, trip);
    await api().post(`/api/v1/partner/bookings/${a.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    await api().post(`/api/v1/partner/trips/${trip.id}/start`).set(auth(partner.token)).expect(200);
    const c = await api().post(`/api/v1/bookings/${a.body.data.id}/cancel`).set(auth(user.token)).send({});
    expect(c.status).toBe(400);
    await api().post(`/api/v1/partner/trips/${trip.id}/complete`).set(auth(partner.token)).expect(200);
  });

  test('passengers are told when the partner changes the departure time', async () => {
    const trip = await newTrip(60);
    const a = await book(user, trip);
    await api().post(`/api/v1/partner/bookings/${a.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    const r = await api()
      .patch(`/api/v1/partner/trips/${trip.id}`)
      .set(auth(partner.token))
      .send({ departureAt: inHours(62) });
    expect(r.status).toBe(200);
    await new Promise((ok) => setTimeout(ok, 300));
    const n = await prisma.notification.findFirst({ where: { userId: user.user.id, type: 'trip_updated' } });
    expect(n).toBeTruthy();
    // The inbox follows the language the user reads the app in now.
    const en = await api().get('/api/v1/me/notifications').set(auth(user.token)).set('Accept-Language', 'en');
    await api().patch('/api/v1/me').set(auth(user.token)).send({ language: 'as' }).expect(200); // what the app's language switch does
    const as = await api().get('/api/v1/me/notifications').set(auth(user.token));
    expect(en.body.data.find((x) => x.type === 'trip_updated').title).toBe('Trip details changed');
    expect(as.body.data.find((x) => x.type === 'trip_updated').title).toBe('যাত্ৰাৰ তথ্য সলনি হৈছে');
    expect(as.body.data[0].data._k).toBeUndefined();
  });

  test('pending requesters are told when the trip starts without them', async () => {
    const trip = await newTrip(2);
    await book(user2, trip);
    await api().post(`/api/v1/partner/trips/${trip.id}/start`).set(auth(partner.token)).expect(200);
    await new Promise((ok) => setTimeout(ok, 300));
    const n = await prisma.notification.findFirst({ where: { userId: user2.user.id, type: 'booking_expired' } });
    expect(n).toBeTruthy();
    await api().post(`/api/v1/partner/trips/${trip.id}/complete`).set(auth(partner.token)).expect(200);
  });

  test('a vehicle suspended by admin takes its trips out of search immediately', async () => {
    const v2 = await approvedVehicle(partner.token, admin, { seats: 4 });
    const r = await api()
      .post('/api/v1/partner/trips')
      .set(auth(partner.token))
      .send({ vehicleId: v2.id, departureAt: inHours(70), stops: route, totalSeats: 2, pricePerSeat: 400 });
    const trip = r.body.data;
    expect((await search({ from: 'tezpur', to: 'guwahati' })).body.data.map((t) => t.id)).toContain(trip.id);
    await api().post(`/api/v1/admin/vehicles/${v2.id}/suspend`).set(auth(admin)).send({ reason: 'Fake insurance' }).expect(200);
    expect((await search({ from: 'tezpur', to: 'guwahati' })).body.data.map((t) => t.id)).not.toContain(trip.id);
    expect((await api().get(`/api/v1/trips/${trip.id}`)).body.data.bookingOpen).toBe(false);
    await new Promise((ok) => setTimeout(ok, 300));
    expect(await prisma.notification.findFirst({ where: { userId: partner.user.id, type: 'vehicle_suspended' } })).toBeTruthy();
  });

  test('a rejected vehicle (after re-review) cannot keep taking bookings', async () => {
    const v3 = await approvedVehicle(partner.token, admin, { seats: 4 });
    const r = await api()
      .post('/api/v1/partner/trips')
      .set(auth(partner.token))
      .send({ vehicleId: v3.id, departureAt: inHours(80), stops: route, totalSeats: 2, pricePerSeat: 400 });
    await api().post(`/api/v1/admin/vehicles/${v3.id}/review`).set(auth(admin)).send({ decision: 'reject', reason: 'RC expired' }).expect(200);
    const b = await book(user, r.body.data);
    expect(b.status).toBe(400);
  });

  test('switched-off rentals are listed after available ones', async () => {
    const renter = await activePartner('rental', { fullName: 'Edge Rentals' });
    const mk = async (on) => {
      const v = await approvedVehicle(renter.token, admin, {
        forTrips: false,
        forRental: true,
        seats: 5,
        rentalPricePerDay: 2000,
        rentalDriverOption: 'with_driver',
        rentalDistrict: 'Sonitpur',
        rentalCity: 'Tezpur',
      });
      await api().patch(`/api/v1/partner/vehicles/${v.id}/availability`).set(auth(renter.token)).send({ isAvailable: on }).expect(200);
      return v;
    };
    const off = await mk(false);
    const on = await mk(true);
    const list = (await api().get('/api/v1/rentals').query({ district: 'Sonitpur' })).body.data;
    const ids = list.map((v) => v.id);
    expect(ids.indexOf(on.id)).toBeLessThan(ids.indexOf(off.id));
    expect(list.find((v) => v.id === off.id).rental.available).toBe(false);
  });

  test('booking input is validated', async () => {
    const trip = await newTrip(90);
    const bad = (body) =>
      api()
        .post('/api/v1/bookings')
        .set(auth(user.token))
        .send({ tripId: trip.id, seats: 1, pickupSeq: 0, dropSeq: 2, ...body });
    expect((await bad({ pickupSeq: 2, dropSeq: 1 })).status).toBe(400);
    expect((await bad({ dropSeq: 9 })).status).toBe(400);
    expect((await bad({ seats: 5 })).status).toBe(400);
    expect((await bad({ seats: 0 })).status).toBe(400);
    expect((await api().post('/api/v1/bookings').set(auth(partner.token)).send({ tripId: trip.id, seats: 1, pickupSeq: 0, dropSeq: 2 })).status).toBe(400); // own trip
    expect((await api().post('/api/v1/bookings').send({ tripId: trip.id, seats: 1, pickupSeq: 0, dropSeq: 2 })).status).toBe(401);
  });

  test('passengers rate completed trips; the rating shows on trip pages and can be moderated', async () => {
    const trip = await newTrip(1.5);
    const a = await book(user, trip);
    await api().post(`/api/v1/partner/bookings/${a.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    const early = await api().put(`/api/v1/bookings/${a.body.data.id}/review`).set(auth(user.token)).send({ rating: 5 });
    expect(early.status).toBe(400); // not completed yet
    await api().post(`/api/v1/partner/trips/${trip.id}/start`).set(auth(partner.token)).expect(200);
    await api().post(`/api/v1/partner/trips/${trip.id}/complete`).set(auth(partner.token)).expect(200);
    expect((await api().put(`/api/v1/bookings/${a.body.data.id}/review`).set(auth(user.token)).send({ rating: 6 })).status).toBe(400);
    expect((await api().put(`/api/v1/bookings/${a.body.data.id}/review`).set(auth(user2.token)).send({ rating: 4 })).status).toBe(404); // not their booking
    await api().put(`/api/v1/bookings/${a.body.data.id}/review`).set(auth(user.token)).send({ rating: 3 }).expect(200);
    const r = await api().put(`/api/v1/bookings/${a.body.data.id}/review`).set(auth(user.token)).send({ rating: 5, comment: 'On time, clean car' });
    expect(r.status).toBe(200); // editing keeps one review per booking
    expect((await api().get(`/api/v1/bookings/${a.body.data.id}`).set(auth(user.token))).body.data.review.rating).toBe(5);

    const next = await newTrip(100);
    const pub = await api().get(`/api/v1/trips/${next.id}`);
    expect(pub.body.data.driver.rating).toEqual({ average: 5, count: 1 });
    expect(pub.body.data.reviews[0]).toMatchObject({ rating: 5, comment: 'On time, clean car' });
    const mine = await api().get('/api/v1/partner/reviews').set(auth(partner.token));
    expect(mine.body.meta).toMatchObject({ average: 5, count: 1 });
    expect((await api().get('/api/v1/partner/dashboard').set(auth(partner.token))).body.data.rating.count).toBe(1);

    const list = await api().get('/api/v1/admin/reviews').set(auth(admin));
    const id = list.body.data.find((x) => x.comment === 'On time, clean car').id;
    await api().post(`/api/v1/admin/reviews/${id}/visibility`).set(auth(admin)).send({ hidden: true }).expect(200);
    expect((await api().get(`/api/v1/trips/${next.id}`)).body.data.driver.rating).toBeNull();
  });
});
