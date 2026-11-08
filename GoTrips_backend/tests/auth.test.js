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

  test('refresh tokens rotate and a replayed token revokes all sessions', async () => {
    const s = await login();
    const r1 = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken });
    expect(r1.status).toBe(200);
    const replay = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('REFRESH_REUSED');
    const r2 = await api().post('/api/v1/auth/refresh').send({ refreshToken: r1.body.data.refreshToken });
    expect(r2.status).toBe(401);
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
