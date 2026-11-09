import { getLang } from './i18n';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
export const LINKS = {
  userApp: import.meta.env.VITE_USER_APP_URL || '',
  partnerApp: import.meta.env.VITE_PARTNER_APP_URL || '',
  company: import.meta.env.VITE_COMPANY_NAME || 'GoTrip',
  address: import.meta.env.VITE_COMPANY_ADDRESS || 'Guwahati, Assam, India',
};

const memo = new Map();

/** GET from the GoTrip API. Identical requests within 60 s share one response. */
export async function api(path, params) {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null))}` : '';
  const url = `${API_URL}${path}${qs}`;
  const key = `${getLang()}|${url}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.promise;
  const promise = fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': getLang() } }).then(async (r) => {
    const body = await r.json().catch(() => null);
    if (!r.ok || !body?.success) {
      memo.delete(key);
      const e = new Error(body?.error?.message || `Request failed (${r.status})`);
      e.status = r.status;
      throw e;
    }
    return body;
  });
  memo.set(key, { at: Date.now(), promise });
  promise.catch(() => memo.delete(key));
  return promise;
}
