import { locale, t } from '../i18n';

const IST = { timeZone: 'Asia/Kolkata' };
export const rupees = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

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
export const fullDate = (d) => (!d ? '—' : isAs() ? asDate(d, { year: true }) : d ? new Date(d).toLocaleDateString(locale(), { ...IST, day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const isoDay = (d) => new Date(d).toLocaleDateString('en-CA', IST); // YYYY-MM-DD in IST
export function ago(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return t('just now');
  if (s < 3600) return t('{0} min ago', [Math.floor(s / 60)]);
  if (s < 86400) return t('{0} h ago', [Math.floor(s / 3600)]);
  return t('{0} d ago', [Math.floor(s / 86400)]);
}
export const titleCase = (s) => (s ? t(String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) : '');
