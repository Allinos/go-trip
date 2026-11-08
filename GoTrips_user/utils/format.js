const IST = { timeZone: 'Asia/Kolkata' };
export const rupees = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const dateLabel = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const timeLabel = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { ...IST, hour: 'numeric', minute: '2-digit' }) : '—');
export const fullDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { ...IST, day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const isoDay = (d) => new Date(d).toLocaleDateString('en-CA', IST); // YYYY-MM-DD in IST
export function ago(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export const titleCase = (s) => (s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');
