const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'gotrip_admin_token';

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const qs = (params) => {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export async function api(path, { method = 'GET', body, params, raw } = {}) {
  const res = await fetch(`${BASE}/admin${path}${qs(params)}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && path !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event('gotrip:logout'));
  }
  if (raw) {
    if (!res.ok) throw new ApiError(res.status, 'ERROR', 'Download failed');
    return res;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new ApiError(res.status, json.error?.code, json.error?.message || `Request failed (${res.status})`, json.error?.details);
  return json;
}

export async function download(path, params, filename) {
  const res = await api(path, { params, raw: true });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
