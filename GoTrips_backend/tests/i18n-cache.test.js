const { api, login, auth, adminToken, activePartner, approvedVehicle, prisma } = require('./helpers');
const counters = require('../src/jobs/counters');

afterAll(() => prisma.$disconnect());
const inHours = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const route = [{ placeName: 'Tezpur' }, { placeName: 'Jamugurihat' }, { placeName: 'Biswanath Chariali' }];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Assamese language support', () => {
  test('content follows Accept-Language / ?lang', async () => {
    const as = await api().get('/api/v1/categories').set('Accept-Language', 'as-IN');
    expect(as.body.data.find((c) => c.code === 'driver').name).toBe('চালক');
    expect(as.body.data.find((c) => c.code === 'driver').documents.find((d) => d.docType === 'aadhaar').label).toBe('আধাৰ কাৰ্ড');
    const en = await api().get('/api/v1/categories');
    expect(en.body.data.find((c) => c.code === 'driver').name).toBe('Driver');
    const faqs = await api().get('/api/v1/faqs?audience=user&lang=as');
    expect(faqs.body.data[0].question).toMatch(/[ঀ-৿]/);
  });

  test('errors are translated', async () => {
    const r = await api().post('/api/v1/auth/otp/send').set('Accept-Language', 'as').send({ phone: '123' });
    expect(r.body.error.message).toBe('সঠিক ১০ সংখ্যাৰ মোবাইল নম্বৰ দিয়ক');
  });

  test('saved language drives notifications and onboarding labels', async () => {
    const admin = await adminToken();
    const partner = await activePartner('taxi', { fullName: 'Assam Taxi' });
    await api().patch('/api/v1/me').set(auth(partner.token)).send({ language: 'as' }).expect(200);
    const ob = await api().get('/api/v1/partner/onboarding').set(auth(partner.token));
    expect(ob.body.data.steps[0].label).toBe('আপোনাৰ নাম');
    expect(ob.body.data.category.name).toBe('টেক্সি / যাত্ৰীবাহী বাহনৰ মালিক');

    const v = await approvedVehicle(partner.token, admin);
    const t = await api().post('/api/v1/partner/trips').set(auth(partner.token)).send({ vehicleId: v.id, departureAt: inHours(10), stops: route, totalSeats: 3, pickupSeq: 0, pricePerSeat: 200 });
    const u = await login('user');
    await api().patch('/api/v1/me').set(auth(u.token)).send({ language: 'as', fullName: 'যাত্ৰী' }).expect(200);

    // Dashboard is cached but must refresh as soon as a request arrives.
    const d1 = await api().get('/api/v1/partner/dashboard').set(auth(partner.token));
    expect(d1.body.data.bookings.pending).toBe(0);
    const b = await api().post('/api/v1/bookings').set(auth(u.token)).send({ tripId: t.body.data.id, seats: 1, pickupSeq: 0, dropSeq: 2 });
    expect(b.status).toBe(201);
    const d2 = await api().get('/api/v1/partner/dashboard').set(auth(partner.token));
    expect(d2.body.data.bookings.pending).toBe(1);

    await api().post(`/api/v1/partner/bookings/${b.body.data.id}/accept`).set(auth(partner.token)).expect(200);
    await wait(150);
    const pn = await api().get('/api/v1/me/notifications?app=partner').set(auth(partner.token));
    expect(pn.body.data.find((n) => n.type === 'booking_request').title).toBe('নতুন বুকিং অনুৰোধ');
    const un = await api().get('/api/v1/me/notifications?app=user').set(auth(u.token));
    expect(un.body.data.find((n) => n.type === 'booking_accepted').title).toBe('বুকিং নিশ্চিত হ’ল 🎉');

    // Trip detail is cached, yet seat count updates right after the accept.
    const td = await api().get(`/api/v1/trips/${t.body.data.id}`);
    expect(td.body.data.availableSeats).toBe(2);
  });
});

describe('Caching', () => {
  test('profile views are buffered and flushed in one batch', async () => {
    const profile = await prisma.driverProfile.findFirst({ where: { isListed: true } });
    if (!profile) return; // listed driver created in other suites; skip if run alone
    const before = profile.viewCount;
    for (let i = 0; i < 5; i++) await api().get(`/api/v1/marketplace/drivers/${profile.id}`).expect(200);
    expect((await prisma.driverProfile.findUnique({ where: { id: profile.id } })).viewCount).toBe(before);
    await counters.flush();
    expect((await prisma.driverProfile.findUnique({ where: { id: profile.id } })).viewCount).toBe(before + 5);
  });

  test('public listings send ETags so unchanged data costs no bandwidth', async () => {
    const r1 = await api().get('/api/v1/locations/districts');
    expect(r1.headers.etag).toBeDefined();
    const r2 = await api().get('/api/v1/locations/districts').set('If-None-Match', r1.headers.etag);
    expect(r2.status).toBe(304);
  });
});
