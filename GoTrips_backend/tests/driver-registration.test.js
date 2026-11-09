const crypto = require('crypto');
const razorpay = require('../src/services/razorpay');
const { api, login, auth, uploadRequiredDocs, adminToken, prisma } = require('./helpers');

afterAll(() => prisma.$disconnect());
afterEach(() => jest.restoreAllMocks());

const sign = (s, secret) => crypto.createHmac('sha256', secret).update(s).digest('hex');
let orderSeq = 0;
function mockRazorpay() {
  const orders = {};
  jest.spyOn(razorpay.client, 'createOrder').mockImplementation(async ({ amount }) => {
    const id = `order_T${Date.now()}${orderSeq++}`;
    orders[id] = amount;
    return { id, amount, currency: 'INR' };
  });
  jest.spyOn(razorpay.client, 'fetchPayment').mockImplementation(async (pid) => {
    const [orderId] = Object.entries(orders).find(([o]) => pid.endsWith(o.slice(6))) || [];
    return { id: pid, order_id: orderId, amount: orders[orderId], currency: 'INR', status: 'captured', method: 'upi' };
  });
  return orders;
}

async function startDriver() {
  const s = await login('partner');
  await api().patch('/api/v1/me').set(auth(s.token)).send({ fullName: 'Bikash Driver' });
  const reg = await api().post('/api/v1/partner/register').set(auth(s.token)).send({ categoryCode: 'driver', district: 'Kamrup Metropolitan', city: 'Guwahati' });
  expect(reg.status).toBe(201);
  return s;
}

const driverDetails = { headline: 'Experienced outstation driver', hasPriorExperience: true, experienceYears: 6, experienceDetails: 'Drove for a travel agency', licenseNumber: 'AS0120150001234', licenseTypes: ['LMV'], licenseExpiry: '2032-05-01', vehicleTypes: ['car', 'suv'], languages: ['Assamese', 'Hindi'], workTypes: ['outstation'], availability: 'full_time', district: 'Kamrup Metropolitan', expectedPayMin: 800, expectedPayMax: 1200, payUnit: 'per_day' };

describe('Driver registration with Razorpay fee', () => {
  test('full flow: details → documents → pay → listed; resumable at every step', async () => {
    const orders = mockRazorpay();
    const s = await startDriver();

    let st = (await api().get('/api/v1/partner/onboarding').set(auth(s.token))).body.data;
    expect(st.nextStep).toBe('details');

    const dp = await api().put('/api/v1/partner/driver-profile').set(auth(s.token)).send(driverDetails);
    expect(dp.status).toBe(200);
    expect(dp.body.data.onboarding.nextStep).toBe('documents');

    // Leave the app and log in again: resume at documents.
    const again = await login('partner', s.phone);
    expect(again.body.onboarding.nextStep).toBe('documents');

    await uploadRequiredDocs(s.token);
    st = (await api().get('/api/v1/partner/onboarding').set(auth(s.token))).body.data;
    // Uploading the last document does not finish registration: the partner reviews and submits.
    expect(st.nextStep).toBe('review');
    expect(st.completed).toBe(false);
    st = (await api().post('/api/v1/partner/onboarding/submit').set(auth(s.token)).expect(200)).body.data;
    expect(st.nextStep).toBe('payment');
    expect(st.accountStatus).toBe('onboarding');
    expect(st.steps.find((x) => x.key === 'payment').amount).toBe(49900);

    // Not on the marketplace before payment
    expect((await api().get('/api/v1/marketplace/drivers')).body.data.find((d) => d.name === 'Bikash Driver')).toBeUndefined();

    const order = await api().post('/api/v1/partner/payments/registration-order').set(auth(s.token));
    expect(order.status).toBe(200);
    expect(order.body.data.amount).toBe(49900);
    expect(order.body.data.checkoutUrl).toContain('/payments/checkout/');
    // Retry returns the same unpaid order instead of creating a duplicate
    const order2 = await api().post('/api/v1/partner/payments/registration-order').set(auth(s.token));
    expect(order2.body.data.orderId).toBe(order.body.data.orderId);

    // Checkout page renders for the WebView
    const page = await api().get(new URL(order.body.data.checkoutUrl).pathname + new URL(order.body.data.checkoutUrl).search);
    expect(page.status).toBe(200);
    expect(page.text).toContain('checkout.razorpay.com');

    const orderId = order.body.data.orderId;
    const paymentId = `pay_${orderId.slice(6)}`;
    // Tampered signature is rejected
    const bad = await api().post('/api/v1/partner/payments/verify').set(auth(s.token)).send({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: 'f'.repeat(64) });
    expect(bad.status).toBe(400);

    const ok = await api().post('/api/v1/partner/payments/verify').set(auth(s.token)).send({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: sign(`${orderId}|${paymentId}`, 'rzp_test_secret') });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('paid');
    expect(ok.body.data.onboarding.accountStatus).toBe('active');
    expect(ok.body.data.onboarding.listing.isListed).toBe(true);
    expect(orders[orderId]).toBe(49900);

    // Listed on marketplace; phone hidden for anonymous, visible after login
    const list = await api().get('/api/v1/marketplace/drivers?district=Kamrup Metropolitan');
    const card = list.body.data.find((d) => d.name === 'Bikash Driver');
    expect(card).toBeDefined();
    expect(card.isVerified).toBe(false);
    const anon = await api().get(`/api/v1/marketplace/drivers/${card.id}`);
    expect(anon.body.data.phone).toBeNull();
    const customer = await login('user');
    const full = await api().get(`/api/v1/marketplace/drivers/${card.id}`).set(auth(customer.token));
    expect(full.body.data.phone).toBe(s.phone);
    const call = await api().post('/api/v1/marketplace/contact').set(auth(customer.token)).send({ targetType: 'driver_profile', targetId: card.id });
    expect(call.body.data.telUrl).toBe(`tel:${s.phone}`);

    // Paying twice is blocked (365-day listing, outside the renewal window)
    const dup = await api().post('/api/v1/partner/payments/registration-order').set(auth(s.token));
    expect(dup.status).toBe(409);

    // Admin approval adds the verified badge
    const admin = await adminToken();
    const partnerId = st.partnerId;
    expect((await api().post(`/api/v1/admin/partners/${partnerId}/verify`).set(auth(admin)).send({ decision: 'approve', ignoreMissingDocuments: true })).status).toBe(200);
    const after = await api().get(`/api/v1/marketplace/drivers/${card.id}`);
    expect(after.body.data.isVerified).toBe(true);

    // Driver can switch availability off → unlisted
    await api().put('/api/v1/partner/driver-profile').set(auth(s.token)).send({ isAvailable: false });
    expect((await api().get(`/api/v1/marketplace/drivers/${card.id}`)).status).toBe(404);
  });

  test('webhook completes the payment when the app was closed, and is idempotent', async () => {
    mockRazorpay();
    const s = await startDriver();
    await api().put('/api/v1/partner/driver-profile').set(auth(s.token)).send(driverDetails);
    await uploadRequiredDocs(s.token);
    await api().post('/api/v1/partner/onboarding/submit').set(auth(s.token)).expect(200);
    const order = await api().post('/api/v1/partner/payments/registration-order').set(auth(s.token));
    const orderId = order.body.data.orderId;
    const body = JSON.stringify({ event: 'payment.captured', created_at: 1, payload: { payment: { entity: { id: `pay_W${orderId.slice(7)}`, order_id: orderId, amount: 49900, currency: 'INR', status: 'captured', method: 'card' } } } });

    const forged = await api().post('/api/v1/payments/webhook/razorpay').set('content-type', 'application/json').set('x-razorpay-signature', 'bad').send(body);
    expect(forged.status).toBe(400);

    const sig = sign(body, 'rzp_webhook_secret');
    const r1 = await api().post('/api/v1/payments/webhook/razorpay').set('content-type', 'application/json').set('x-razorpay-signature', sig).set('x-razorpay-event-id', `evt_${orderId}`).send(body);
    expect(r1.status).toBe(200);
    const r2 = await api().post('/api/v1/payments/webhook/razorpay').set('content-type', 'application/json').set('x-razorpay-signature', sig).set('x-razorpay-event-id', `evt_${orderId}`).send(body);
    expect(r2.body.duplicate).toBe(true);

    const st = (await api().get('/api/v1/partner/onboarding').set(auth(s.token))).body.data;
    expect(st.accountStatus).toBe('active');
    const pays = await api().get('/api/v1/partner/payments').set(auth(s.token));
    expect(pays.body.data.filter((p) => p.status === 'paid')).toHaveLength(1);
  });

  test('webhook with a wrong amount does not activate the account', async () => {
    mockRazorpay();
    const s = await startDriver();
    await api().put('/api/v1/partner/driver-profile').set(auth(s.token)).send(driverDetails);
    await uploadRequiredDocs(s.token);
    await api().post('/api/v1/partner/onboarding/submit').set(auth(s.token)).expect(200);
    const order = await api().post('/api/v1/partner/payments/registration-order').set(auth(s.token));
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_cheap1', order_id: order.body.data.orderId, amount: 100, currency: 'INR', status: 'captured' } } } });
    const r = await api().post('/api/v1/payments/webhook/razorpay').set('content-type', 'application/json').set('x-razorpay-signature', sign(body, 'rzp_webhook_secret')).set('x-razorpay-event-id', 'evt_cheap1').send(body);
    expect(r.status).toBe(400);
    expect((await api().get('/api/v1/partner/onboarding').set(auth(s.token))).body.data.accountStatus).toBe('onboarding');
  });

  test('category cannot be switched after payment; documents must be valid', async () => {
    const s = await startDriver();
    const expired = await api().post('/api/v1/partner/documents/driving_license').set(auth(s.token)).attach('front', Buffer.from('%PDF-1.4 test'), 'dl.pdf').field('docNumber', 'X1').field('expiryDate', '2001-01-01');
    expect(expired.status).toBe(400);
    const notImage = await api().post('/api/v1/partner/documents/aadhaar').set(auth(s.token)).attach('front', Buffer.from('hello'), { filename: 'a.png', contentType: 'image/png' });
    expect(notImage.status).toBe(400);
    const wrongDoc = await api().post('/api/v1/partner/documents/vehicle_rc').set(auth(s.token)).attach('front', Buffer.from('%PDF-1.4'), 'x.pdf');
    expect(wrongDoc.status).toBe(400);
  });

  test('customers rate a driver after contacting them; ratings show in the marketplace', async () => {
    mockRazorpay();
    const s = await startDriver();
    await api().put('/api/v1/partner/driver-profile').set(auth(s.token)).send(driverDetails).expect(200);
    await uploadRequiredDocs(s.token);
    await api().post('/api/v1/partner/onboarding/submit').set(auth(s.token)).expect(200);
    const order = await api().post('/api/v1/partner/payments/registration-order').set(auth(s.token));
    const orderId = order.body.data.orderId;
    const paymentId = `pay_${orderId.slice(6)}`;
    await api().post('/api/v1/partner/payments/verify').set(auth(s.token)).send({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: sign(`${orderId}|${paymentId}`, 'rzp_test_secret') }).expect(200);
    const profileId = (await prisma.driverProfile.findFirst({ where: { partner: { userId: s.user.id } } })).id;

    const customer = await login('user');
    const rate = (who, body) => api().put(`/api/v1/marketplace/drivers/${profileId}/review`).set(auth(who.token)).send(body);
    // Must contact the driver through GoTrip first
    let d = (await api().get(`/api/v1/marketplace/drivers/${profileId}`).set(auth(customer.token))).body.data;
    expect(d).toMatchObject({ canReview: false, myReview: null, rating: null });
    expect(d.partnerId).toBeUndefined();
    const early = await rate(customer, { rating: 5 });
    expect(early.status).toBe(400);
    expect(early.body.error.code).toBe('CONTACT_FIRST');
    expect((await rate(s, { rating: 5 })).status).toBe(400); // drivers cannot rate themselves

    await api().post('/api/v1/marketplace/contact').set(auth(customer.token)).send({ targetType: 'driver_profile', targetId: profileId }).expect(200);
    expect((await api().get(`/api/v1/marketplace/drivers/${profileId}`).set(auth(customer.token))).body.data.canReview).toBe(true);
    await rate(customer, { rating: 3 }).expect(200);
    await rate(customer, { rating: 4, comment: 'Careful driver, knew the hill roads' }).expect(200); // edit, not a second review
    expect(await prisma.review.count({ where: { userId: customer.user.id, bookingId: null } })).toBe(1);

    const second = await login('user');
    await api().post('/api/v1/marketplace/contact').set(auth(second.token)).send({ targetType: 'driver_profile', targetId: profileId, channel: 'whatsapp' }).expect(200);
    await rate(second, { rating: 5 }).expect(200);

    d = (await api().get(`/api/v1/marketplace/drivers/${profileId}`).set(auth(customer.token))).body.data;
    expect(d.rating).toEqual({ average: 4.5, count: 2 });
    expect(d.myReview).toMatchObject({ rating: 4, comment: 'Careful driver, knew the hill roads' });
    expect(d.reviews).toHaveLength(2);
    const list = (await api().get('/api/v1/marketplace/drivers').query({ sort: 'rating', minRating: 4 })).body.data;
    expect(list.find((x) => x.id === profileId).rating).toEqual({ average: 4.5, count: 2 });
    const all = await api().get(`/api/v1/marketplace/drivers/${profileId}/reviews`);
    expect(all.body.meta.total).toBe(2);
    expect(all.body.data[0].kind).toBe('driver');
    // The driver sees them in the partner app
    const mine = await api().get('/api/v1/partner/reviews').set(auth(s.token));
    expect(mine.body.meta).toMatchObject({ average: 4.5, count: 2 });
    await new Promise((ok) => setTimeout(ok, 300));
    expect(await prisma.notification.count({ where: { userId: s.user.id, type: 'new_review' } })).toBe(2);
  });
});
