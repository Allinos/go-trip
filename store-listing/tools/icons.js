const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKEND = path.join(ROOT, 'GoTrips_backend');
const WORK = path.join(__dirname, '../build');
const sharp = require(path.join(BACKEND, 'node_modules/sharp'));
const OUT = path.join(WORK, 'icons');
// Front-facing car glyph in a 1024 box, centred in the safe zone.
const car = (fill, light, window) => `
  <g transform="translate(512 540)">
    <path d="M-300 40 L-250 -150 Q-232 -215 -165 -215 L165 -215 Q232 -215 250 -150 L300 40 Q340 55 340 110 L340 230 Q340 255 315 255 L-315 255 Q-340 255 -340 230 L-340 110 Q-340 55 -300 40 Z" fill="${fill}"/>
    <path d="M-235 25 L-200 -125 Q-190 -165 -150 -165 L150 -165 Q190 -165 200 -125 L235 25 Z" fill="${window}"/>
    <circle cx="-215" cy="135" r="48" fill="${light}"/>
    <circle cx="215" cy="135" r="48" fill="${light}"/>
    <rect x="-95" y="115" width="190" height="40" rx="20" fill="${window}"/>
    <rect x="-300" y="255" width="120" height="85" rx="30" fill="${fill}"/>
    <rect x="180" y="255" width="120" height="85" rx="30" fill="${fill}"/>
  </g>`;
const wheel = (cx, cy, r, ring, bg) => `
  <g transform="translate(${cx} ${cy})">
    <circle r="${r}" fill="${bg}"/>
    <circle r="${r * 0.62}" fill="none" stroke="${ring}" stroke-width="${r * 0.16}"/>
    <circle r="${r * 0.16}" fill="${ring}"/>
    <path d="M${-r * 0.6} 0 L${r * 0.6} 0 M0 0 L0 ${r * 0.6}" stroke="${ring}" stroke-width="${r * 0.14}" stroke-linecap="round"/>
  </g>`;
const svg = (body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}${body}</svg>`;
const scaled = (inner, s) => `<g transform="translate(512 512) scale(${s}) translate(-512 -512)">${inner}</g>`;
const RED = '#EF4444', NAVY = '#111827';
const user = car('#FFFFFF', '#FDE68A', RED);
const partner = car('#FFFFFF', '#FDE68A', NAVY) + wheel(780, 250, 150, '#FFFFFF', RED);
const jobs = {
  'user-icon': svg(scaled(user, 0.78), RED),
  'user-fg': svg(scaled(user, 0.58)),
  'user-bg': svg('', RED),
  'user-mono': svg(scaled(car('#000', '#fff0', '#fff0'), 0.58)),
  'user-splash': svg(scaled(user, 0.5)),
  'partner-icon': svg(scaled(partner, 0.78), NAVY),
  'partner-fg': svg(scaled(partner, 0.58)),
  'partner-bg': svg('', NAVY),
  'partner-mono': svg(scaled(car('#000', '#fff0', '#fff0') + wheel(780, 250, 150, '#fff0', '#000'), 0.58)),
  'partner-splash': svg(scaled(partner, 0.5)),
};
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  for (const [name, s] of Object.entries(jobs)) await sharp(Buffer.from(s)).png().toFile(`${OUT}/${name}.png`);
  // store icons 512x512 (32-bit PNG, full square: Play applies the mask)
  await sharp(`${OUT}/user-icon.png`).resize(512).png().toFile(`${OUT}/store-user-512.png`);
  await sharp(`${OUT}/partner-icon.png`).resize(512).png().toFile(`${OUT}/store-partner-512.png`);
  const prev = await Promise.all(['user-icon', 'partner-icon'].map((n) => sharp(`${OUT}/${n}.png`).resize(240).composite([{ input: Buffer.from('<svg width="240" height="240"><rect width="240" height="240" rx="56" fill="#fff"/></svg>'), blend: 'dest-in' }]).png().toBuffer()));
  await sharp({ create: { width: 560, height: 280, channels: 4, background: '#f3f4f6' } }).composite(prev.map((b, i) => ({ input: b, left: 20 + i * 280, top: 20 }))).png().toFile(`${OUT}/preview.png`);
})();
