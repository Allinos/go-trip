// Renders Play Store phone screenshots (1080x1920) and feature graphics (1024x500) from the raw app captures.
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKEND = path.join(ROOT, 'GoTrips_backend');
const WORK = path.join(__dirname, '../build');
const { chromium } = require('playwright');
const fs = require('fs');
const RAW = path.join(WORK, 'raw');
const OUT = path.join(__dirname, '..');
const img = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;

const THEMES = {
  user: { bg: 'radial-gradient(900px 700px at 85% 0%, #FB923C 0%, transparent 60%), linear-gradient(160deg, #EF4444 0%, #DC2626 55%, #B91C1C 100%)', text: '#fff', sub: 'rgba(255,255,255,.88)', accent: '#FDE68A' },
  partner: { bg: 'radial-gradient(900px 700px at 90% 0%, rgba(239,68,68,.45) 0%, transparent 60%), linear-gradient(165deg, #1F2937 0%, #111827 60%, #0B1220 100%)', text: '#fff', sub: 'rgba(255,255,255,.78)', accent: '#F87171' },
};

const SLIDES = {
  user: [
    ['u1-home', 'Shared rides', 'across Assam', 'Find a seat in a car going your way'],
    ['u2-results', 'Book from any stop', 'on the route', 'Trips passing through your town show up too'],
    ['u3-trip-top', 'See the route,', 'stops and fare', 'No booking fees. Pay the driver directly'],
    ['u4-booking-live', 'Track your', 'driver live', 'Open the driver’s location in Google Maps'],
    ['u5-rentals', 'Rent cars, SUVs', 'and buses', 'Self-drive or with a driver, from verified owners'],
    ['u6-driver-profile', 'Hire a', 'verified driver', 'Check experience and ratings, then call directly'],
    ['u7-rate', 'Honest ratings', 'from real trips', 'Rate your ride and help other travellers'],
    ['u8-home-as', 'এতিয়া', 'অসমীয়াতো', 'Use GoTrip in Assamese or English'],
  ],
  partner: [
    ['p1-home', 'Your business', 'at a glance', 'Requests, trips, earnings and rating in one place'],
    ['p2-requests', 'Accept seat requests', 'in one tap', 'Get notified the moment a passenger books'],
    ['p3-create-trip', 'Publish trips', 'with stops', 'Fill empty seats from every town on the way'],
    ['p3-trip-detail', 'Share your', 'live location', 'Confirmed passengers see you on Google Maps'],
    ['p4-vehicles', 'Manage all', 'your vehicles', 'Switch each vehicle ON or OFF any time'],
    ['p6-earnings', 'Keep 100%', 'of your fares', 'No commission. Track estimated earnings'],
    ['p7-reviews', 'Build your', 'reputation', 'Ratings and reviews from your passengers'],
    ['p8-driver-home', 'Get hired', 'as a driver', 'Customers find your profile and call you'],
  ],
};

const statusBar = `<div class="sb"><span>9:41</span><span class="sbi"><svg width="18" height="14" viewBox="0 0 18 14"><path d="M1 13h3V9H1zM6 13h3V6H6zM11 13h3V3h-3zM16 13h1V0h-1z" fill="#111"/></svg><svg width="18" height="14" viewBox="0 0 24 18"><path d="M12 17l3.5-4a5 5 0 0 0-7 0zM4 9a11 11 0 0 1 16 0l-2 2.2a8 8 0 0 0-12 0zM0 5a17 17 0 0 1 24 0l-2 2.2A14 14 0 0 0 2 7.2z" fill="#111"/></svg><svg width="26" height="14" viewBox="0 0 26 14"><rect x=".5" y=".5" width="22" height="13" rx="3" fill="none" stroke="#111"/><rect x="2" y="2" width="16" height="10" rx="2" fill="#111"/><rect x="23.5" y="4.5" width="2" height="5" rx="1" fill="#111"/></svg></span></div>`;

const css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, 'Noto Sans Bengali', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.slide { width: 1080px; height: 1920px; position: relative; overflow: hidden; }
.head { position: absolute; top: 96px; left: 0; right: 0; text-align: center; padding: 0 70px; }
.head h1 { font-size: 92px; line-height: 1.06; font-weight: 800; letter-spacing: -2px; }
.head h1 span { display: block; }
.head p { font-size: 40px; margin-top: 26px; font-weight: 500; }
.phone { position: absolute; left: 50%; transform: translateX(-50%); top: 430px; width: 720px; border-radius: 78px; background: #0b0b0f; padding: 20px; box-shadow: 0 40px 90px rgba(0,0,0,.35), inset 0 0 0 3px #2a2a33; }
.screen { border-radius: 60px; overflow: hidden; background: #fff; position: relative; }
.screen img { display: block; width: 100%; }
.sb { height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px 0 46px; font-weight: 700; font-size: 24px; color: #111; background: #fff; }
.sbi { display: flex; gap: 10px; align-items: center; }
.cam { position: absolute; top: 14px; left: 50%; width: 22px; height: 22px; margin-left: -11px; border-radius: 50%; background: #0b0b0f; }
.brand { position: absolute; bottom: 0; }
/* feature graphic */
.fg { width: 1024px; height: 500px; position: relative; overflow: hidden; color: #fff; }
.fg .txt { position: absolute; left: 64px; top: 0; bottom: 0; width: 520px; display: flex; flex-direction: column; justify-content: center; }
.fg .logo { display: flex; align-items: center; gap: 18px; font-size: 52px; font-weight: 800; letter-spacing: -1px; }
.fg .logo img { width: 84px; height: 84px; border-radius: 22px; box-shadow: 0 8px 20px rgba(0,0,0,.25); }
.fg h2 { font-size: 40px; line-height: 1.15; font-weight: 800; margin-top: 26px; letter-spacing: -.5px; }
.fg p { font-size: 22px; margin-top: 14px; opacity: .9; }
.fg .ph { position: absolute; width: 230px; border-radius: 34px; background: #0b0b0f; padding: 9px; box-shadow: 0 24px 50px rgba(0,0,0,.4); }
.fg .ph img { width: 100%; display: block; border-radius: 26px; }
`;

const slideHtml = (theme, [file, l1, l2, sub]) => `<div class="slide" style="background:${theme.bg}">
  <div class="head" style="color:${theme.text}"><h1><span>${l1}</span><span style="color:${theme.accent}">${l2}</span></h1><p style="color:${theme.sub}">${sub}</p></div>
  <div class="phone"><div class="screen">${statusBar}<img src="${img(`${RAW}/${file}.png`)}"/></div><div class="cam"></div></div>
</div>`;

const featureHtml = (app) => {
  const t = THEMES[app];
  const [a, b] = app === 'user' ? ['u1-home', 'u2-results'] : ['p1-home', 'p2-requests'];
  const icon = img(path.join(WORK, `icons/store-${app}-512.png`));
  const title = app === 'user' ? 'GoTrip' : 'GoTrip Partner';
  const h = app === 'user' ? 'Shared rides, rentals and drivers across Assam' : 'Fill empty seats. Rent out vehicles. Get hired.';
  const p = app === 'user' ? 'Book from any stop · Pay the driver directly' : 'No commission · Customers call you directly';
  return `<div class="fg" style="background:${t.bg}">
    <div class="txt"><div class="logo"><img src="${icon}"/>${title}</div><h2>${h}</h2><p>${p}</p></div>
    <div class="ph" style="left:640px; top:70px; transform: rotate(-6deg)"><img src="${img(`${RAW}/${a}.png`)}"/></div>
    <div class="ph" style="left:800px; top:120px; transform: rotate(6deg)"><img src="${img(`${RAW}/${b}.png`)}"/></div>
  </div>`;
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const app of ['user', 'partner']) {
    for (const [i, s] of SLIDES[app].entries()) {
      await page.setContent(`<style>${css}</style>${slideHtml(THEMES[app], s)}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${OUT}/${app}/${app}-${i + 1}-${s[0].replace(/^[up]\d-/, '')}.png`, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    }
    await page.setViewportSize({ width: 1024, height: 500 });
    await page.setContent(`<style>${css}</style>${featureHtml(app)}`, { waitUntil: 'load' });
    await page.screenshot({ path: `${OUT}/${app}/${app}-feature-graphic-1024x500.png`, clip: { x: 0, y: 0, width: 1024, height: 500 } });
    await page.setViewportSize({ width: 1080, height: 1920 });
    fs.copyFileSync(path.join(WORK, `icons/store-${app}-512.png`), `${OUT}/${app}/${app}-icon-512.png`);
  }
  await browser.close();
  console.log('done');
})();
