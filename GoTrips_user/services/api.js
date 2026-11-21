import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants';
import { getLang, t } from '../i18n';

const ACCESS = 'gt_user_access';
const REFRESH = 'gt_user_refresh';
const web = Platform.OS === 'web';
const store = {
  get: (k) => (web ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k, v) => (web ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k) => (web ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};

let accessToken = null;
let onExpired = () => {};
export const setSessionExpiredHandler = (fn) => (onExpired = fn);
export const tokens = {
  load: async () => (accessToken = await store.get(ACCESS)),
  save: async ({ accessToken: a, refreshToken: r }) => {
    accessToken = a;
    await store.set(ACCESS, a);
    if (r) await store.set(REFRESH, r);
  },
  clear: async () => {
    accessToken = null;
    await store.del(ACCESS);
    await store.del(REFRESH);
  },
  refresh: () => store.get(REFRESH),
};

const http = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });
http.interceptors.request.use((c) => {
  if (accessToken) c.headers.Authorization = `Bearer ${accessToken}`;
  c.headers['Accept-Language'] = getLang();
  return c;
});


/**
 * Identical GETs that are already on their way share one request (screens and providers often ask for
 * the same thing at the same moment, e.g. /config on start-up).
 */
const inflight = new Map();
const rawGet = http.get.bind(http);
http.get = (url, config = {}) => {
  const key = `${url}?${JSON.stringify(config.params || {})}|${accessToken || ''}|${getLang()}`;
  if (inflight.has(key)) return inflight.get(key);
  const p = rawGet(url, config).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
};

let refreshing = null;
/**
 * Only the server saying "this session is over" (401/403 from /auth/refresh) may sign the user out.
 * No internet, a timeout or a server error keeps the tokens: the request fails and is retried later.
 */
const sessionRejected = (e) => e?.definitive || e?.response?.status === 401 || e?.response?.status === 403;
// Login, refresh and logout handle their own 401s; everything else (including /auth/me) refreshes first.
const NO_REFRESH = ['/auth/otp', '/auth/refresh', '/auth/logout'];

http.interceptors.response.use(
  (r) => r.data,
  async (error) => {
    const cfg = error.config;
    if (error.response?.status === 401 && cfg && !cfg._retried && !NO_REFRESH.some((p) => cfg.url.includes(p))) {
      cfg._retried = true;
      try {
        refreshing ||= (async () => {
          const rt = await tokens.refresh();
          if (!rt) throw Object.assign(new Error('no refresh'), { definitive: true });
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt }, { timeout: 15000 });
          await tokens.save(data.data);
        })().finally(() => (refreshing = null));
        await refreshing;
        return http(cfg);
      } catch (e) {
        if (sessionRejected(e)) {
          await tokens.clear();
          onExpired();
        }
      }
    } else if (error.response?.data?.error?.code === 'ACCOUNT_BLOCKED') onExpired(error.response.data.error.message);
    return Promise.reject(error);
  }
);

export function errorMessage(e) {
  if (e?.response?.data?.error?.message) return e.response.data.error.message;
  if (e?.message === 'Network Error') return t('No internet connection. Please try again.');
  return e?.message || t('Something went wrong');
}
export const errorCode = (e) => e?.response?.data?.error?.code;

const APP = 'user';

export const authAPI = {
  sendOtp: (phone) => http.post('/auth/otp/send', { phone, app: APP, language: getLang() }),
  verifyOtp: (phone, otp, deviceInfo) => http.post('/auth/otp/verify', { phone, otp, app: APP, deviceInfo, language: getLang() }),
  me: () => http.get('/auth/me'),
  logout: (refreshToken, pushToken) => http.post('/auth/logout', { refreshToken, pushToken }),
};

export const catalogAPI = {
  config: () => http.get('/config'),
  districts: () => http.get('/locations/districts'),
  searchPlaces: (q) => http.get('/locations/search', { params: { q } }),
  faqs: () => http.get('/faqs', { params: { audience: 'user' } }),
};

export const userAPI = {
  update: (body) => http.patch('/me', body),
  remove: () => http.delete('/me'),
  registerPush: (token, platform) => http.post('/me/push-tokens', { token, platform, app: APP }),
  notifications: (page = 1) => http.get('/me/notifications', { params: { app: APP, page } }),
  unread: () => http.get('/me/notifications/unread-count', { params: { app: APP } }),
  markRead: () => http.post('/me/notifications/read', { app: APP }),
  savedPlaces: () => http.get('/me/saved-places'),
  addPlace: (body) => http.post('/me/saved-places', body),
  updatePlace: (id, body) => http.put(`/me/saved-places/${id}`, body),
  deletePlace: (id) => http.delete(`/me/saved-places/${id}`),
  tickets: () => http.get('/me/tickets'),
  createTicket: (body) => http.post('/me/tickets', { ...body, app: APP }),
};

export const tripAPI = {
  search: (params) => http.get('/trips/search', { params }),
  get: (id) => http.get(`/trips/${id}`),
};

export const bookingAPI = {
  create: (body) => http.post('/bookings', body),
  list: (params) => http.get('/bookings', { params }),
  get: (id) => http.get(`/bookings/${id}`),
  location: (id) => http.get(`/bookings/${id}/location`),
  cancel: (id, reason) => http.post(`/bookings/${id}/cancel`, { reason }),
  review: (id, body) => http.put(`/bookings/${id}/review`, body),
};

export const rentalAPI = {
  search: (params) => http.get('/rentals', { params }),
  get: (id) => http.get(`/rentals/${id}`),
};

export const marketplaceAPI = {
  drivers: (params) => http.get('/marketplace/drivers', { params }),
  driver: (id) => http.get(`/marketplace/drivers/${id}`),
  review: (id, body) => http.put(`/marketplace/drivers/${id}/review`, body),
  contact: (targetType, targetId, channel = 'call') => http.post('/marketplace/contact', { targetType, targetId, channel }),
};

export const goodsAPI = {
  create: (body) => http.post('/goods-orders', body),
  list: () => http.get('/goods-orders'),
  close: (id, status) => http.post(`/goods-orders/${id}/close`, { status }),
};
