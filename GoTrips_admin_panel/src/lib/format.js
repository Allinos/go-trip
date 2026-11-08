export const inr = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const rupees = (r) => (r == null ? '—' : `₹${Number(r).toLocaleString('en-IN')}`);
export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const label = (s) => (s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');
export const num = (n) => (n ?? 0).toLocaleString('en-IN');
