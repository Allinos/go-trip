const { api, login, auth, adminToken, activePartner, prisma } = require('./helpers');

afterAll(() => prisma.$disconnect());

describe('Admin panel API', () => {
  test('login rejects bad credentials and partner tokens', async () => {
    const r = await api().post('/api/v1/admin/auth/login').send({ email: 'nobody@test.in', password: 'whatever-123' });
    expect(r.status).toBe(401);
    const u = await login('user');
    expect((await api().get('/api/v1/admin/dashboard').set(auth(u.token))).status).toBe(401);
  });

  test('dashboard, lists, partner verification, suspension, block', async () => {
    const admin = await adminToken();
    const p = await activePartner('taxi', { fullName: 'Verify Me' });
    const d = await api().get('/api/v1/admin/dashboard').set(auth(admin));
    expect(d.status).toBe(200);
    expect(d.body.data.users.total).toBeGreaterThan(0);

    const list = await api().get('/api/v1/admin/partners').query({ q: 'Verify Me' }).set(auth(admin));
    expect(list.body.data).toHaveLength(1);
    const id = list.body.data[0].id;
    const detail = await api().get(`/api/v1/admin/partners/${id}`).set(auth(admin));
    expect(detail.body.data.documents.length).toBeGreaterThan(0);
    expect(detail.body.data.documents[0].frontUrl).toContain('/files/');

    // Signed file URL works, tampered one is refused
    const url = new URL(detail.body.data.documents[0].frontUrl);
    expect((await api().get(url.pathname + url.search)).status).toBe(200);
    expect((await api().get(url.pathname + url.search.replace(/s=[^&]+/, 's=deadbeef'))).status).toBe(403);

    const docId = detail.body.data.documents[0].id;
    await api().post(`/api/v1/admin/partners/${id}/verify`).set(auth(admin)).send({ decision: 'reject', reason: 'Blurry photo', documents: [{ id: docId, status: 'rejected', reason: 'Blurry' }] }).expect(200);
    const st = (await api().get('/api/v1/partner/onboarding').set(auth(p.token))).body.data;
    expect(st.verificationStatus).toBe('rejected');
    expect(st.steps.find((s) => s.key === 'documents').missing[0].rejected).toBe(true);

    await api().post(`/api/v1/admin/partners/${id}/suspend`).set(auth(admin)).send({ reason: 'Fraud report' }).expect(200);
    expect((await api().get('/api/v1/partner/dashboard').set(auth(p.token))).status).toBe(403);
    await api().post(`/api/v1/admin/partners/${id}/reactivate`).set(auth(admin)).expect(200);
    expect((await api().get('/api/v1/partner/dashboard').set(auth(p.token))).status).toBe(200);

    const u = await login('user');
    await api().post(`/api/v1/admin/users/${u.user.id}/block`).set(auth(admin)).send({ reason: 'Spam' }).expect(200);
    expect((await api().get('/api/v1/me').set(auth(u.token))).status).toBe(403);

    const logs = await api().get('/api/v1/admin/audit-logs').set(auth(admin));
    expect(logs.body.data.some((l) => l.action === 'partner.suspend')).toBe(true);
  });

  test('categories, fee changes and RBAC', async () => {
    const support = await adminToken('support');
    const sa = await adminToken('super_admin');
    expect((await api().get('/api/v1/admin/categories').set(auth(support))).status).toBe(200);
    const cats = (await api().get('/api/v1/admin/categories').set(auth(sa))).body.data;
    const driver = cats.find((c) => c.code === 'driver');
    expect((await api().patch(`/api/v1/admin/categories/${driver.id}`).set(auth(support)).send({ registrationFee: 59900 })).status).toBe(403);
    await api().patch(`/api/v1/admin/categories/${driver.id}`).set(auth(sa)).send({ registrationFee: 59900 }).expect(200);
    const cfg = await api().get('/api/v1/categories');
    expect(cfg.body.data.find((c) => c.code === 'driver').registrationFee).toBe(59900);
    await api().patch(`/api/v1/admin/categories/${driver.id}`).set(auth(sa)).send({ registrationFee: 49900 }).expect(200);

    const created = await api().post('/api/v1/admin/categories').set(auth(sa)).send({ code: 'bike_taxi', name: 'Bike Taxi', registrationFee: 0, canListVehicles: true, canCreateTrips: true });
    expect(created.status).toBe(201);
    await api().post(`/api/v1/admin/categories/${created.body.data.id}/requirements`).set(auth(sa)).send({ scope: 'partner', docType: 'driving_license', label: 'Driving licence', requiresNumber: true }).expect(201);
    expect((await api().get('/api/v1/categories')).body.data.find((c) => c.code === 'bike_taxi').documents).toHaveLength(1);
  });

  test('payments list and CSV export', async () => {
    const sa = await adminToken();
    const r = await api().get('/api/v1/admin/payments').set(auth(sa));
    expect(r.status).toBe(200);
    const csv = await api().get('/api/v1/admin/payments/export.csv').set(auth(sa));
    expect(csv.status).toBe(200);
    expect(csv.text.split('\n')[0]).toContain('Receipt');
  });
});
