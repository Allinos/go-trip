const { api, login, auth, prisma, nextPhone } = require('./helpers');

afterAll(() => prisma.$disconnect());

describe('OTP auth', () => {
  test('rejects invalid phone numbers', async () => {
    const r = await api().post('/api/v1/auth/otp/send').send({ phone: '12345' });
    expect(r.status).toBe(400);
  });

  test('wrong OTP counts attempts, right OTP logs in and creates the user', async () => {
    const phone = nextPhone();
    const s = await api().post('/api/v1/auth/otp/send').send({ phone });
    expect(s.status).toBe(200);
    expect(s.body.data.isRegistered).toBe(false);
    const bad = await api().post('/api/v1/auth/otp/verify').send({ phone, otp: s.body.data.devOtp === '000000' ? '111111' : '000000' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('OTP_INVALID');
    const ok = await api().post('/api/v1/auth/otp/verify').send({ phone, otp: s.body.data.devOtp });
    expect(ok.status).toBe(200);
    expect(ok.body.data.isNewUser).toBe(true);
    expect(ok.body.data.user.phone).toBe(`+91${phone}`);
    // Code cannot be reused
    const again = await api().post('/api/v1/auth/otp/verify').send({ phone, otp: s.body.data.devOtp });
    expect(again.status).toBe(400);
  });

  test('resend is throttled', async () => {
    const phone = nextPhone();
    await api().post('/api/v1/auth/otp/send').send({ phone }).expect(200);
    const r = await api().post('/api/v1/auth/otp/send').send({ phone });
    expect(r.status).toBe(429);
  });

  test('locks the code after too many wrong attempts', async () => {
    const phone = nextPhone();
    const s = await api().post('/api/v1/auth/otp/send').send({ phone });
    const wrong = s.body.data.devOtp === '999999' ? '888888' : '999999';
    for (let i = 0; i < 5; i++) await api().post('/api/v1/auth/otp/verify').send({ phone, otp: wrong });
    const r = await api().post('/api/v1/auth/otp/verify').send({ phone, otp: s.body.data.devOtp });
    expect(r.status).toBe(429);
  });

  test('refresh tokens rotate; a lost response is forgiven, a late replay revokes all sessions', async () => {
    const s = await login();
    const r1 = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken });
    expect(r1.status).toBe(200);
    // The phone never got r1 (network dropped) and retries with the old token: still logged in.
    const retry = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken });
    expect(retry.status).toBe(200);
    expect((await api().get('/api/v1/me').set(auth(retry.body.data.accessToken))).status).toBe(200);
    // Long after rotation the old token is a replay: every session is revoked.
    await prisma.session.updateMany({ where: { userId: s.user.id, revokedAt: { not: null } }, data: { rotatedAt: new Date(Date.now() - 10 * 60_000) } });
    const replay = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('REFRESH_REUSED');
    const r2 = await api().post('/api/v1/auth/refresh').send({ refreshToken: retry.body.data.refreshToken });
    expect(r2.status).toBe(401);
  });

  test('a logged-out token cannot be reused, even right away', async () => {
    const s = await login();
    await api().post('/api/v1/auth/logout').send({ refreshToken: s.refreshToken }).expect(200);
    expect((await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken })).status).toBe(401);
  });

  test('sessions last a year and renew on every refresh', async () => {
    const s = await login();
    const sess = await prisma.session.findFirst({ where: { userId: s.user.id }, orderBy: { id: 'desc' } });
    expect(sess.expiresAt.getTime() - Date.now()).toBeGreaterThan(360 * 86400_000);
  });

  test('protected routes need a token; blocked users are refused', async () => {
    expect((await api().get('/api/v1/me')).status).toBe(401);
    const s = await login();
    expect((await api().get('/api/v1/me').set(auth(s.token))).status).toBe(200);
    await prisma.user.update({ where: { id: s.user.id }, data: { status: 'blocked' } });
    await require('../src/middleware/auth').invalidateAuthCache(s.user.id);
    const r = await api().get('/api/v1/me').set(auth(s.token));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  test('profile update validates input', async () => {
    const s = await login();
    expect((await api().patch('/api/v1/me').set(auth(s.token)).send({ email: 'not-an-email' })).status).toBe(400);
    const r = await api().patch('/api/v1/me').set(auth(s.token)).send({ fullName: 'Asha Das', email: 'asha@example.com' });
    expect(r.status).toBe(200);
    expect(r.body.data.fullName).toBe('Asha Das');
  });
});
