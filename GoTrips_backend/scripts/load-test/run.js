/**
 * Realistic mixed-traffic load test: N concurrent users, each doing an action every THINK_MIN..THINK_MAX seconds.
 *   node load.js <users> <durationSec> <thinkMinSec> <thinkMaxSec>
 */
const http = require('http');
const jwt = require('jsonwebtoken');
const [USERS, DURATION, TMIN, TMAX] = process.argv.slice(2).map(Number);
const SECRET = process.env.JWT_ACCESS_SECRET;
const TARGET = new URL(process.env.TARGET || 'http://127.0.0.1:3000');
const agent = new http.Agent({ keepAlive: true, maxSockets: 512 });
const TOWNS = ['Nagaon', 'Guwahati', 'Jorhat', 'Tezpur', 'Dibrugarh', 'Silchar', 'Jagiroad', 'Sonapur', 'Golaghat', 'Bokakhat', 'Biswanath', 'Morigaon'];
const DISTRICTS = ['Nagaon', 'Kamrup Metropolitan', 'Jorhat', 'Sonitpur', 'Dibrugarh', 'Cachar'];
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const tok = (id, app) => jwt.sign({ sub: String(id), app, typ: 'access' }, SECRET, { expiresIn: '2h', issuer: 'gotrip-api', audience: app });
const day = (d) => new Date(Date.now() + d * 86400_000 + 330 * 60_000).toISOString().slice(0, 10);

const stats = {};
let inflight = 0;
function req(name, method, path, token, body, lang) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    inflight++;
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: TARGET.hostname, port: TARGET.port || 80, method, path, agent, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Accept-Language': lang || 'en', ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) } }, (res) => {
      res.resume();
      res.on('end', () => {
        inflight--;
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        const s = (stats[name] ||= { n: 0, err: 0, lat: [], codes: {} });
        s.n++;
        s.lat.push(ms);
        s.codes[res.statusCode] = (s.codes[res.statusCode] || 0) + 1;
        if (res.statusCode >= 500 || res.statusCode === 429) s.err++;
        resolve(res.statusCode);
      });
    });
    r.on('error', () => {
      inflight--;
      const s = (stats[name] ||= { n: 0, err: 0, lat: [], codes: {} });
      s.n++;
      s.err++;
      s.codes.ERR = (s.codes.ERR || 0) + 1;
      resolve(0);
    });
    if (data) r.write(data);
    r.end();
  });
}

// Weighted actions a real customer / partner performs.
const customerActions = [
  [30, (u) => { const a = pick(TOWNS); let b = pick(TOWNS); if (b === a) b = 'Guwahati'; return req('trips/search', 'GET', `/api/v1/trips/search?from=${a}&to=${b}${Math.random() < 0.6 ? `&date=${day(rnd(5))}` : ''}`, u.token, null, u.lang); }],
  [12, (u) => req('marketplace/drivers', 'GET', `/api/v1/marketplace/drivers?district=${encodeURIComponent(pick(DISTRICTS))}${Math.random() < 0.3 ? '&workType=outstation' : ''}`, u.token, null, u.lang)],
  [8, (u) => req('marketplace/driver', 'GET', `/api/v1/marketplace/drivers/${1 + rnd(600)}`, u.token, null, u.lang)],
  [10, (u) => req('rentals', 'GET', `/api/v1/rentals?district=${encodeURIComponent(pick(DISTRICTS))}${Math.random() < 0.3 ? '&availableOnly=true' : ''}`, u.token, null, u.lang)],
  [5, (u) => req('rentals/detail', 'GET', `/api/v1/rentals/${4 * (1 + rnd(999))}`, u.token, null, u.lang)],
  [10, (u) => req('trips/detail', 'GET', `/api/v1/trips/${u.tripBase + rnd(5400)}`, u.token, null, u.lang)],
  [8, (u) => req('me/unread', 'GET', '/api/v1/me/notifications/unread-count?app=user', u.token, null, u.lang)],
  [7, (u) => req('bookings/mine', 'GET', '/api/v1/bookings?when=upcoming', u.token, null, u.lang)],
  [5, (u) => req('config', 'GET', '/api/v1/config', null, null, u.lang)],
  [2, (u) => req('me/notifications', 'GET', '/api/v1/me/notifications?app=user', u.token, null, u.lang)],
  [1, (u) => req('bookings/create', 'POST', '/api/v1/bookings', u.token, { tripId: u.tripBase + rnd(5400), seats: 1, pickupSeq: 0, dropSeq: 1 }, u.lang)],
];
const partnerActions = [
  [40, (u) => req('partner/location', 'POST', '/api/v1/partner/location', u.token, { lat: 26 + Math.random(), lng: 92 + Math.random() }, u.lang)],
  [25, (u) => req('partner/dashboard', 'GET', '/api/v1/partner/dashboard', u.token, null, u.lang)],
  [20, (u) => req('partner/bookings', 'GET', '/api/v1/partner/bookings?status=pending', u.token, null, u.lang)],
  [15, (u) => req('partner/trips', 'GET', '/api/v1/partner/trips?when=upcoming', u.token, null, u.lang)],
];
const choose = (list) => {
  let x = Math.random() * list.reduce((a, [w]) => a + w, 0);
  for (const [w, f] of list) if ((x -= w) <= 0) return f;
  return list[0][1];
};

(async () => {
  const tripBase = Number(process.env.TRIP_BASE);
  const end = Date.now() + DURATION * 1000;
  const t0 = Date.now();
  const vus = [];
  for (let i = 0; i < USERS; i++) {
    // ~10% partners (taxi/rental owners, user ids 601-2000), 90% customers (ids 2001-20000)
    const partner = i % 10 === 0;
    const id = partner ? 601 + (i % 1400) : 2001 + (i % 18000);
    vus.push({ token: tok(id, partner ? 'partner' : 'user'), partner, lang: i % 2 ? 'as' : 'en', tripBase });
  }
  const run = async (u, delay) => {
    await new Promise((r) => setTimeout(r, delay));
    while (Date.now() < end) {
      await choose(u.partner ? partnerActions : customerActions)(u);
      await new Promise((r) => setTimeout(r, (TMIN + Math.random() * (TMAX - TMIN)) * 1000));
    }
  };
  const mon = setInterval(() => {}, 1000);
  await Promise.all(vus.map((u, i) => run(u, (i / USERS) * Math.min(15000, DURATION * 300))));
  clearInterval(mon);
  const secs = (Date.now() - t0) / 1000;
  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  let total = 0, errs = 0;
  const all = [];
  const rows = Object.entries(stats).sort((a, b) => b[1].n - a[1].n).map(([k, s]) => {
    s.lat.sort((a, b) => a - b);
    total += s.n; errs += s.err; all.push(...s.lat);
    return `${k.padEnd(20)} ${String(s.n).padStart(7)}  p50 ${pct(s.lat, 0.5).toFixed(0).padStart(5)}ms  p95 ${pct(s.lat, 0.95).toFixed(0).padStart(5)}ms  p99 ${pct(s.lat, 0.99).toFixed(0).padStart(5)}ms  errors ${s.err}  ${JSON.stringify(s.codes)}`;
  });
  all.sort((a, b) => a - b);
  console.log(`\n=== ${USERS} concurrent users, think ${TMIN}-${TMAX}s, ${secs.toFixed(0)}s ===`);
  console.log(`total ${total} requests  ${(total / secs).toFixed(0)} req/s  errors ${errs} (${((errs / total) * 100).toFixed(2)}%)  overall p50 ${pct(all, 0.5).toFixed(0)}ms p95 ${pct(all, 0.95).toFixed(0)}ms p99 ${pct(all, 0.99).toFixed(0)}ms`);
  rows.forEach((r) => console.log(r));
  process.exit(0);
})();
