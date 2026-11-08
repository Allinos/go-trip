import { locale, t } from '../i18n';

export const rupees = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const paise = (p) => rupees(Math.round((p || 0) / 100));

const IST = { timeZone: 'Asia/Kolkata' };

// Assamese dates are formatted here instead of relying on the phone's Intl data,
// which is often missing Assamese on Android (and in some browsers).
const AS_DAYS = ['দেও', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্ৰ', 'শনি'];
const AS_MONTHS = ['জানু', 'ফেব্ৰু', 'মাৰ্চ', 'এপ্ৰিল', 'মে’', 'জুন', 'জুলাই', 'আগ', 'ছেপ্ট', 'অক্টো', 'নৱে', 'ডিচে'];
const ist = (d) => new Date(new Date(d).getTime() + 330 * 60_000); // read with getUTC* = India time
const asDate = (d, { weekday, year } = {}) => {
  const x = ist(d);
  return `${weekday ? `${AS_DAYS[x.getUTCDay()]}, ` : ''}${x.getUTCDate()} ${AS_MONTHS[x.getUTCMonth()]}${year ? ` ${x.getUTCFullYear()}` : ''}`;
};
const asTime = (d) => {
  const x = ist(d);
  const h = x.getUTCHours();
  return `${h < 12 ? 'পূৰ্বাহ্ন' : 'অপৰাহ্ন'} ${h % 12 || 12}:${String(x.getUTCMinutes()).padStart(2, '0')}`;
};
const isAs = () => locale() === 'as-IN';

export const dateLabel = (d) => (!d ? '—' : isAs() ? asDate(d, { weekday: true }) : d ? new Date(d).toLocaleDateString(locale(), { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const timeLabel = (d) => (!d ? '—' : isAs() ? asTime(d) : d ? new Date(d).toLocaleTimeString(locale(), { ...IST, hour: 'numeric', minute: '2-digit' }) : '—');
export const dateTimeLabel = (d) => (d ? `${dateLabel(d)}, ${timeLabel(d)}` : '—');
export const fullDate = (d) => (!d ? '—' : isAs() ? asDate(d, { year: true }) : d ? new Date(d).toLocaleDateString(locale(), { ...IST, day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export function ago(d) {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return t('just now');
  if (s < 3600) return t('{0} min ago', [Math.floor(s / 60)]);
  if (s < 86400) return t('{0} h ago', [Math.floor(s / 3600)]);
  return t('{0} d ago', [Math.floor(s / 86400)]);
}

export const titleCase = (s) => (s ? t(String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) : '');

const VEHICLE_RAW = {
  hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV (Innova, Ertiga…)', van: 'Van', mini_bus: 'Mini bus', bus: 'Bus', auto: 'Auto rickshaw', bike: 'Bike',
  pickup: 'Pickup', tempo: 'Tempo', mini_truck: 'Mini truck', truck: 'Truck', trailer: 'Trailer', other: 'Other',
};

const STATUS_RAW = {
  pending: 'Waiting', accepted: 'Confirmed', rejected: 'Declined', cancelled: 'Cancelled', completed: 'Completed', expired: 'Expired',
  scheduled: 'Upcoming', ongoing: 'On the way', approved: 'Verified', suspended: 'Suspended', unverified: 'Not submitted',
  paid: 'Paid', created: 'Pending', failed: 'Failed',
};

// Translated on read, so they follow the current language.
const translated = (raw) => new Proxy(raw, { get: (o, k) => (typeof o[k] === 'string' ? t(o[k]) : o[k]) });
export const VEHICLE_LABELS = translated(VEHICLE_RAW);
export const STATUS_TEXT = translated(STATUS_RAW);
