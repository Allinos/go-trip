const request = require('supertest');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const app = require('../app');
const prisma = require('../src/lib/prisma');

const api = () => request(app);
let phoneSeq = 0;
const nextPhone = () => `9${String(Date.now() % 1e6).padStart(6, '0')}${String(phoneSeq++).padStart(3, '0')}`.slice(0, 10);

/** Log in through the real OTP flow (console SMS returns devOtp in non-production). */
async function login(app_ = 'user', phone = nextPhone()) {
  const s = await api().post('/api/v1/auth/otp/send').send({ phone, app: app_ });
  if (s.status !== 200) throw new Error(JSON.stringify(s.body));
  await prisma.otpCode.updateMany({ where: { phone: s.body.data.phone }, data: { createdAt: new Date(Date.now() - 60_000) } }); // bypass 30s resend gap in tests
  const v = await api().post('/api/v1/auth/otp/verify').send({ phone, otp: s.body.data.devOtp, app: app_ });
  if (v.status !== 200) throw new Error(JSON.stringify(v.body));
  return { token: v.body.data.accessToken, refreshToken: v.body.data.refreshToken, user: v.body.data.user, body: v.body.data, phone: s.body.data.phone };
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

let png;
async function image() {
  png ||= await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 50, b: 50 } } }).png().toBuffer();
  return png;
}

async function adminToken(role = 'super_admin') {
  const email = `${role}-${Date.now()}-${phoneSeq++}@test.in`;
  await prisma.adminUser.create({ data: { email, name: role, role, passwordHash: await bcrypt.hash('password-123456', 4) } });
  const r = await api().post('/api/v1/admin/auth/login').send({ email, password: 'password-123456' });
  return r.body.data.token;
}

/** Upload every required partner document for the partner's category. */
async function uploadRequiredDocs(token) {
  const docs = await api().get('/api/v1/partner/documents').set(auth(token));
  for (const { requirement: r } of docs.body.data.filter((d) => d.requirement.isRequired)) {
    const req = api().post(`/api/v1/partner/documents/${r.docType}`).set(auth(token)).attach('front', await image(), 'f.png');
    if (r.requiresBack) req.attach('back', await image(), 'b.png');
    if (r.requiresNumber) req.field('docNumber', 'AB123456');
    if (r.requiresExpiry) req.field('expiryDate', '2030-01-01');
    const res = await req;
    if (res.status !== 200) throw new Error(`${r.docType}: ${JSON.stringify(res.body)}`);
  }
}

/** Fully registered, active partner of a category (no fee categories). */
async function activePartner(categoryCode = 'taxi', extra = {}) {
  const s = await login('partner');
  await api().patch('/api/v1/me').set(auth(s.token)).send({ fullName: extra.fullName || 'Test Partner' });
  const r = await api().post('/api/v1/partner/register').set(auth(s.token)).send({ categoryCode, district: 'Nagaon', city: 'Nagaon', ...extra.details });
  if (r.status >= 300) throw new Error(JSON.stringify(r.body));
  await uploadRequiredDocs(s.token);
  return s;
}

const uniqueReg = () => `AS${10 + Math.floor(Math.random() * 89)}${String.fromCharCode(65 + Math.floor(Math.random() * 26), 65 + Math.floor(Math.random() * 26))}${1000 + Math.floor(Math.random() * 9000)}`;

async function approvedVehicle(partnerToken, admin, body = {}) {
  const v = await api()
    .post('/api/v1/partner/vehicles')
    .set(auth(partnerToken))
    .send({ vehicleClass: 'suv', make: 'Toyota', model: 'Innova', registrationNumber: uniqueReg(), seats: 7, forTrips: true, ...body });
  if (v.status !== 201) throw new Error(JSON.stringify(v.body));
  const r = await api().post(`/api/v1/admin/vehicles/${v.body.data.id}/review`).set(auth(admin)).send({ decision: 'approve' });
  if (r.status !== 200) throw new Error(JSON.stringify(r.body));
  return v.body.data;
}

module.exports = { api, login, auth, image, adminToken, uploadRequiredDocs, activePartner, approvedVehicle, prisma, nextPhone };
