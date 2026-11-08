import { create } from 'zustand';
import { Platform } from 'react-native';
import { authAPI, catalogAPI, setSessionExpiredHandler, tokens } from '../services/api';
import { clearCache, readCache, setCacheScope, writeCache } from '../services/cache';

/**
 * Customers can browse without an account. Logging in is required to book, call, or see bookings.
 * `pendingAction` lets a screen ask for login and continue after it succeeds.
 */
const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  config: null,
  districts: [],

  /** App config + districts: saved copy first (instant, offline), then refreshed from the server. */
  reloadCatalog: async () => {
    const cached = await readCache('catalog');
    if (cached) set(cached.data);
    try {
      const [config, districts] = await Promise.all([catalogAPI.config(), catalogAPI.districts()]);
      const fresh = { config: config.data, districts: districts.data };
      set(fresh);
      writeCache('catalog', fresh);
    } catch {
      /* keep cached copy */
    }
  },

  initialize: async () => {
    setSessionExpiredHandler(() => set({ user: null, isAuthenticated: false }));
    get().reloadCatalog();
    try {
      if (await tokens.load()) {
        const r = await authAPI.me();
        setCacheScope(r.data.user.id);
        set({ user: r.data.user, isAuthenticated: true });
      }
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) await tokens.clear();
    } finally {
      set({ isLoading: false });
    }
  },

  sendOtp: (phone) => authAPI.sendOtp(phone),

  verifyOtp: async (phone, otp) => {
    const r = await authAPI.verifyOtp(phone, otp, Platform.OS);
    await tokens.save(r.data);
    setCacheScope(r.data.user.id);
    set({ user: r.data.user, isAuthenticated: true });
    return r.data;
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      const rt = await tokens.refresh();
      if (rt) await authAPI.logout(rt, globalThis.__gtPushToken);
    } catch {
      /* ignore */
    }
    await tokens.clear();
    await clearCache();
    setCacheScope(null);
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
