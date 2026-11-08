import { locale, t } from '../i18n';

export const rupees = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const paise = (p) => rupees(Math.round((p || 0) / 100));

const IST = { timeZone: 'Asia/Kolkata' };
export const dateLabel = (d) => (d ? new Date(d).toLocaleDateString(locale(), { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const timeLabel = (d) => (d ? new Date(d).toLocaleTimeString(locale(), { ...IST, hour: 'numeric', minute: '2-digit' }) : '—');
export const dateTimeLabel = (d) => (d ? `${dateLabel(d)}, ${timeLabel(d)}` : '—');
export const fullDate = (d) => (d ? new Date(d).toLocaleDateString(locale(), { ...IST, day: 'numeric', month: 'short', year: 'numeric' }) : '—');

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
