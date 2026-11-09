const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKEND = path.join(ROOT, 'GoTrips_backend');
const WORK = path.join(__dirname, '../build');
const { chromium } = require('playwright');
const OUT = path.join(WORK, 'raw');
const only = process.argv[2];
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const mk = async (lang = 'en') => {
    const c = await browser.newContext({ viewport: { width: 412, height: 870 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, permissions: ['geolocation'], geolocation: { latitude: 26.35, longitude: 92.68 } });
    await c.addInitScript((l) => { try { localStorage.setItem('gotrip_lang', l); } catch {} }, lang);
    const p = await c.newPage();
    p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    p.on('dialog', (d) => d.accept());
    await p.route(/^(tel:|https:\/\/wa\.me)/, (r) => r.abort());
    return p;
  };
  const tap = async (p, text, w = 900, exact = true) => { await p.getByText(text, { exact }).last().click(); await p.waitForTimeout(w); };
  const snap = async (p, name, wait = 1800) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };

  if (!only || only === 'user') {
    const U = await mk();
    await U.goto('http://localhost:8082/settings'); await U.waitForTimeout(1800);
    await tap(U, 'Log in / Sign up');
    await U.getByPlaceholder('98765 43210').fill('9000000001');
    await tap(U, 'Get OTP', 1500);
    const c = (await U.getByText(/Your code is \d{6}/).textContent()).match(/\d{6}/)[0];
    await U.getByLabel('OTP code').fill(c); await U.waitForTimeout(2500);
    await U.goto('http://localhost:8082/'); await snap(U, 'u1-home', 2500);
    await U.goto('http://localhost:8082/search/results?from=Nagaon&to=Guwahati&seats=1'); await snap(U, 'u2-results', 2500);
    await U.goto('http://localhost:8082/ride/3?pickupSeq=1&dropSeq=3&seats=2'); await U.waitForTimeout(2500);
    await snap(U, 'u3-trip-top', 300);
    await U.mouse.wheel(0, 520); await snap(U, 'u3-trip-driver', 1200);
    await U.goto('http://localhost:8082/booking/1'); await snap(U, 'u4-booking-live', 2500);
    await U.goto('http://localhost:8082/rental'); await snap(U, 'u5-rentals', 3000);
    await U.goto('http://localhost:8082/marketplace'); await snap(U, 'u6-drivers', 2500);
    await U.goto('http://localhost:8082/marketplace/1'); await snap(U, 'u6-driver-profile', 2500);
    await U.mouse.wheel(0, 700); await snap(U, 'u6-driver-reviews', 1200);
    // completed booking to rate
    const completedId = Number(process.env.RATE_BOOKING || 0);
    await U.goto(`http://localhost:8082/booking/${completedId}`); await U.waitForTimeout(2500);
    await U.getByLabel('5 star(s)').click(); await U.waitForTimeout(500);
    await U.getByPlaceholder('Tell other passengers about the driver (optional)').fill('Safe driving and left on time. Clean AC car!');
    await U.evaluate(() => document.activeElement?.blur());
    await U.waitForTimeout(400);
    await U.mouse.wheel(0, 200); await snap(U, 'u7-rate', 800);
    // Assamese
    await U.goto('http://localhost:8082/settings'); await U.waitForTimeout(1500);
    await tap(U, 'অসমীয়া', 2500);
    await U.goto('http://localhost:8082/'); await snap(U, 'u8-home-as', 2500);
    await U.goto('http://localhost:8082/search/results?from=Nagaon&to=Guwahati&seats=1'); await snap(U, 'u8-results-as', 2500);
    await tap(U, 'English', 1000).catch(() => {});
  }

  if (!only || only === 'partner' || only === 'partner2') {
    const login = async (phone) => {
      const P = await mk();
      await P.goto('http://localhost:8081');
      await tap(P, 'English'); await tap(P, 'Get started');
      await P.getByPlaceholder('98765 43210').fill(phone);
      await tap(P, 'Send OTP', 1500);
      const c = (await P.getByText(/Your code is \d{6}/).textContent()).match(/\d{6}/)[0];
      await P.getByLabel('OTP code').fill(c);
      await P.getByText('Home', { exact: true }).last().waitFor({ timeout: 15000 });
      return P;
    };
    const P = await login('9100000003');
    if (only !== 'partner2') {
    await snap(P, 'p1-home', 2500);
    await P.mouse.wheel(0, 600); await snap(P, 'p1-home-2', 1200);
    await P.mouse.wheel(0, -2000);
    await tap(P, 'Bookings', 1500); await snap(P, 'p2-requests', 1200);
    }
    await P.goto('http://localhost:8081'); await P.getByText('Home', { exact: true }).last().waitFor();
    await tap(P, 'Trips', 1500); await snap(P, 'p3-trips', 1200);
    await P.getByText('Guwahati ISBT', { exact: true }).first().click(); await P.waitForTimeout(2000);
    await snap(P, 'p3-trip-detail', 300);
    await tap(P, 'Repeat this trip', 1800);
    await snap(P, 'p3-create-trip', 600);
    await P.goto('http://localhost:8081'); await P.getByText('Home', { exact: true }).last().waitFor();
    await tap(P, 'Vehicles', 1500); await snap(P, 'p4-vehicles', 1500);
    await tap(P, 'Account', 1200); await tap(P, 'Share live location', 1500); await snap(P, 'p5-location', 1500);
    await P.goto('http://localhost:8081'); await P.getByText('Home', { exact: true }).last().waitFor();
    await tap(P, 'Account', 1200); await tap(P, 'Earnings & history', 2000); await snap(P, 'p6-earnings', 1500);
    await P.goto('http://localhost:8081'); await P.getByText('Home', { exact: true }).last().waitFor();
    await tap(P, 'Account', 1200); await tap(P, 'Ratings & reviews', 2000); await snap(P, 'p7-reviews', 1500);
    const D = await login('9100000001');
    await snap(D, 'p8-driver-home', 2500);
  }
  await browser.close();
})().catch((e) => { console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
