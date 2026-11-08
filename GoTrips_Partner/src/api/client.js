import axios from 'axios';
import Constants from 'expo-constants';
import { secure } from './storage';

/**
 * API base URL: EXPO_PUBLIC_API_URL (.env) → app.json extra.apiUrl → Android emulator default.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3000/api/v1';

const ACCESS = 'gt_partner_access';
const REFRESH = 'gt_partner_refresh';
let accessToken = null;
let onSessionExpired = () => {};

export const setSessionExpiredHandler = (fn) => (onSessionExpired = fn);

export async function loadTokens() {
  accessToken = await secure.get(ACCESS);
  return !!accessToken;
}
export async function saveTokens({ accessToken: a, refreshToken: r }) {
  accessToken = a;
  await secure.set(ACCESS, a);
  if (r) await secure.set(REFRESH, r);
}
export async function clearTokens() {
  accessToken = null;
  await secure.del(ACCESS);
  await secure.del(REFRESH);
}
export const getRefreshToken = () => secure.get(REFRESH);

export const http = axios.create({ baseURL: API_URL, timeout: 20000, headers: { Accept: 'application/json' } });

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Refresh the access token once for all requests that failed with 401 at the same time.
let refreshing = null;
async function refresh() {
  const rt = await getRefreshToken();
  if (!rt) throw new Error('no refresh token');
  const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: rt }, { timeout: 15000 });
  await saveTokens(data.data);
  return data.data.accessToken;
}

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config;
    const code = error.response?.data?.error?.code;
    if (error.response?.status === 401 && cfg && !cfg._retried && !cfg.url.includes('/auth/')) {
      cfg._retried = true;
      try {
        refreshing ||= refresh().finally(() => (refreshing = null));
        await refreshing;
        return http(cfg);
      } catch {
        await clearTokens();
        onSessionExpired();
      }
    } else if (error.response?.status === 403 && ['ACCOUNT_BLOCKED', 'PARTNER_SUSPENDED'].includes(code)) {
      onSessionExpired(error.response.data.error.message);
    }
    return Promise.reject(error);
  }
);

/** Human-friendly message from any API / network error. */
export function errorMessage(e) {
  if (e?.response?.data?.error?.message) return e.response.data.error.message;
  if (e?.code === 'ECONNABORTED') return 'The server is taking too long. Please try again.';
  if (e?.message === 'Network Error') return 'No internet connection. Please check and try again.';
  return e?.message || 'Something went wrong';
}
export const errorCode = (e) => e?.response?.data?.error?.code;

/** Unwraps { success, data, meta }. */
export const get = async (url, params) => {
  const r = await http.get(url, { params });
  return r.data;
};
export const post = async (url, body) => (await http.post(url, body)).data;
export const put = async (url, body) => (await http.put(url, body)).data;
export const patch = async (url, body) => (await http.patch(url, body)).data;
export const del = async (url, body) => (await http.delete(url, { data: body })).data;

/** Multipart upload. files: [{ field, uri, name?, type? }] */
export async function upload(url, files, fields = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') form.append(k, String(v));
  for (const f of files) {
    if (!f?.uri) continue;
    const type = f.type || (f.uri.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const name = f.name || `${f.field}.${type === 'application/pdf' ? 'pdf' : 'jpg'}`;
    if (f.uri.startsWith('blob:') || f.uri.startsWith('data:')) {
      const blob = await (await fetch(f.uri)).blob(); // web
      form.append(f.field, blob, name);
    } else {
      form.append(f.field, { uri: f.uri, name, type });
    }
  }
  const r = await http.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000, transformRequest: (d) => d });
  return r.data;
}
