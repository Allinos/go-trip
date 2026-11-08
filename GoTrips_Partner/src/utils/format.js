export const rupees = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const paise = (p) => rupees(Math.round((p || 0) / 100));

const IST = { timeZone: 'Asia/Kolkata' };
export const dateLabel = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const timeLabel = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { ...IST, hour: 'numeric', minute: '2-digit' }) : '—');
export const dateTimeLabel = (d) => (d ? `${dateLabel(d)}, ${timeLabel(d)}` : '—');
export const fullDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { ...IST, day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export function ago(d) {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const titleCase = (s) => (s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

export const VEHICLE_LABELS = {
  hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV (Innova, Ertiga…)', van: 'Van', mini_bus: 'Mini bus', bus: 'Bus', auto: 'Auto rickshaw', bike: 'Bike',
  pickup: 'Pickup', tempo: 'Tempo', mini_truck: 'Mini truck', truck: 'Truck', trailer: 'Trailer', other: 'Other',
};

export const STATUS_TEXT = {
  pending: 'Waiting', accepted: 'Confirmed', rejected: 'Declined', cancelled: 'Cancelled', completed: 'Completed', expired: 'Expired',
  scheduled: 'Upcoming', ongoing: 'On the way', approved: 'Verified', suspended: 'Suspended', unverified: 'Not submitted',
  paid: 'Paid', created: 'Pending', failed: 'Failed',
};
