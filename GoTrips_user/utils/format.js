import { locale, t } from '../i18n';

const IST = { timeZone: 'Asia/Kolkata' };
export const rupees = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const dateLabel = (d) => (d ? new Date(d).toLocaleDateString(locale(), { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const timeLabel = (d) => (d ? new Date(d).toLocaleTimeString(locale(), { ...IST, hour: 'numeric', minute: '2-digit' }) : '—');
export const fullDate = (d) => (d ? new Date(d).toLocaleDateString(locale(), { ...IST, day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const isoDay = (d) => new Date(d).toLocaleDateString('en-CA', IST); // YYYY-MM-DD in IST
export function ago(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return t('just now');
  if (s < 3600) return t('{0} min ago', [Math.floor(s / 60)]);
  if (s < 86400) return t('{0} h ago', [Math.floor(s / 3600)]);
  return t('{0} d ago', [Math.floor(s / 86400)]);
}
export const titleCase = (s) => (s ? t(String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) : '');
