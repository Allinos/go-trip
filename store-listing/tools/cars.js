// Illustrated vehicle scenes (no stock photos needed): sky, tea-garden hills, road and a vehicle.
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKEND = path.join(ROOT, 'GoTrips_backend');
const WORK = path.join(__dirname, '../build');
const sharp = require(path.join(BACKEND, 'node_modules/sharp'));
const fs = require('fs');
const shapes = {
  sedan: 'M150 330 L190 270 Q205 250 235 248 L420 246 Q455 246 480 268 L540 315 L640 330 Q675 336 678 365 L680 398 L120 398 L118 360 Q120 335 150 330 Z',
  hatch: 'M170 330 L215 262 Q228 246 255 246 L430 246 Q465 248 490 280 L540 330 L620 338 Q660 344 662 370 L664 398 L140 398 L140 360 Q142 336 170 330 Z',
  suv: 'M140 320 L170 235 Q180 215 210 213 L470 212 Q505 213 525 240 L570 305 L650 318 Q685 325 688 355 L690 398 L112 398 L112 350 Q114 324 140 320 Z',
  van: 'M120 330 L120 210 Q122 186 150 184 L560 184 Q590 186 610 215 L668 300 Q690 318 690 345 L690 398 L112 398 Z',
  bus: 'M100 398 L100 170 Q102 148 128 146 L660 146 Q690 148 696 178 L708 300 L708 398 Z',
};
const windows = {
  sedan: '<path d="M215 300 L245 266 Q252 260 268 260 L345 260 L345 300 Z M360 260 L420 260 Q440 262 455 276 L478 300 L360 300 Z" fill="#cfe7f7" opacity=".95"/>',
  hatch: '<path d="M232 300 L258 264 Q264 258 280 258 L352 258 L352 300 Z M366 258 L428 258 Q452 262 470 290 L476 300 L366 300 Z" fill="#cfe7f7"/>',
  suv: '<path d="M190 290 L205 238 Q210 228 228 228 L330 228 L330 290 Z M345 228 L460 228 Q488 230 502 252 L528 290 L345 290 Z" fill="#cfe7f7"/>',
  van: '<rect x="150" y="205" width="90" height="70" rx="8" fill="#cfe7f7"/><rect x="255" y="205" width="90" height="70" rx="8" fill="#cfe7f7"/><rect x="360" y="205" width="90" height="70" rx="8" fill="#cfe7f7"/><path d="M465 205 L560 205 Q585 208 600 232 L630 285 L465 285 Z" fill="#cfe7f7"/>',
  bus: [130, 215, 300, 385, 470, 555].map((x) => `<rect x="${x}" y="172" width="72" height="82" rx="8" fill="#cfe7f7"/>`).join('') + '<rect x="640" y="172" width="48" height="120" rx="8" fill="#cfe7f7"/>',
};
function scene(kind, color, sky = ['#bfe3ff', '#eef8ff']) {
  const wheel = (x) => `<circle cx="${x}" cy="398" r="40" fill="#1f2937"/><circle cx="${x}" cy="398" r="18" fill="#9ca3af"/>`;
  const wx = kind === 'bus' ? [200, 610] : kind === 'van' ? [215, 580] : [240, 560];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
  <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".82"/></linearGradient></defs>
  <rect width="800" height="500" fill="url(#s)"/>
  <circle cx="660" cy="90" r="42" fill="#fff4c2"/>
  <path d="M0 300 Q120 200 250 270 T520 250 T800 260 L800 500 L0 500 Z" fill="#8cc58f"/>
  <path d="M0 330 Q160 260 330 320 T800 300 L800 500 L0 500 Z" fill="#5fae6b"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 95 - 20} 345 q45 -18 90 0" stroke="#4b9a58" stroke-width="7" fill="none"/>`).join('')}
  <rect y="410" width="800" height="90" fill="#4b5563"/>
  ${[0, 1, 2, 3, 4].map((i) => `<rect x="${i * 180 + 20}" y="452" width="90" height="8" rx="4" fill="#e5e7eb"/>`).join('')}
  <ellipse cx="400" cy="436" rx="300" ry="14" fill="#000" opacity=".18"/>
  <path d="${shapes[kind]}" fill="url(#b)"/>
  ${windows[kind]}
  <rect x="${kind === 'bus' ? 660 : 640}" y="${kind === 'bus' ? 320 : 345}" width="30" height="14" rx="5" fill="#fde68a"/>
  ${wheel(wx[0])}${wheel(wx[1])}
</svg>`;
}
module.exports = async function make(file, kind, color, sky) {
  await sharp(Buffer.from(scene(kind, color, sky))).jpeg({ quality: 88 }).toFile(file);
};
if (require.main === module) {
  (async () => {
    fs.mkdirSync(path.join(WORK, 'preview'), { recursive: true });
    for (const [k, c] of [['sedan', '#ef4444'], ['suv', '#111827'], ['van', '#f8fafc'], ['bus', '#2563eb'], ['hatch', '#f59e0b']]) await module.exports(path.join(WORK, `preview/${k}.jpg`), k, c);
    const imgs = await Promise.all(['sedan', 'suv', 'van', 'bus', 'hatch'].map((k) => sharp(path.join(WORK, `preview/${k}.jpg`)).resize(400).toBuffer()));
    await sharp({ create: { width: 2000, height: 250, channels: 3, background: '#fff' } }).composite(imgs.map((b, i) => ({ input: b, left: i * 400, top: 0 }))).png().toFile(path.join(WORK, 'preview/all.png'));
  })();
}
