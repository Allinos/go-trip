import { getLang } from './i18n';

const AS_DIGITS = '০১২৩৪৫৬৭৮৯';
const digits = (s) => (getLang() === 'as' ? String(s).replace(/\d/g, (d) => AS_DIGITS[d]) : String(s));
const AS_MONTHS = ['জানুৱাৰী', 'ফেব্ৰুৱাৰী', 'মাৰ্চ', 'এপ্ৰিল', 'মে’', 'জুন', 'জুলাই', 'আগষ্ট', 'ছেপ্তেম্বৰ', 'অক্টোবৰ', 'নৱেম্বৰ', 'ডিচেম্বৰ'];
const AS_DAYS = ['দেওবাৰ', 'সোমবাৰ', 'মঙলবাৰ', 'বুধবাৰ', 'বৃহস্পতিবাৰ', 'শুক্ৰবাৰ', 'শনিবাৰ'];

/** Rupees (amounts in whole rupees). */
export const rupees = (n) => (n == null ? '—' : `₹${digits(Number(n).toLocaleString('en-IN'))}`);
/** Registration fees are stored in paise. */
export const paise = (p) => rupees(Math.round(p / 100));

const ist = (d) => new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

export function dateLabel(d) {
  const x = ist(d);
  if (getLang() === 'as') return `${AS_DAYS[x.getDay()]}, ${digits(x.getDate())} ${AS_MONTHS[x.getMonth()]}`;
  return new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
}
export function timeLabel(d) {
  const x = ist(d);
  const h = x.getHours();
  const m = String(x.getMinutes()).padStart(2, '0');
  if (getLang() === 'as') return `${h < 12 ? 'পুৱা' : h < 17 ? 'দুপৰীয়া' : 'সন্ধিয়া'} ${digits(((h + 11) % 12) + 1)}:${digits(m)}`;
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'am' : 'pm'}`;
}
export const num = digits;
export const titleCase = (s) => (s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');
export function ago(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  const as = getLang() === 'as';
  if (s < 3600) return as ? `${digits(Math.max(1, Math.round(s / 60)))} মিনিট আগতে` : `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return as ? `${digits(Math.round(s / 3600))} ঘণ্টা আগতে` : `${Math.round(s / 3600)} h ago`;
  return as ? `${digits(Math.round(s / 86400))} দিন আগতে` : `${Math.round(s / 86400)} days ago`;
}
export const todayIST = (plusDays = 0) => {
  const x = ist(Date.now() + plusDays * 86400_000);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
