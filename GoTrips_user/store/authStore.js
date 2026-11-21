import { create } from 'zustand';
import { Platform } from 'react-native';
import { authAPI, catalogAPI, setSessionExpiredHandler, tokens } from '../services/api';
import { clearCache, readCache, setCacheScope, writeCache } from '../services/cache';
import { clearSession, loadSession, saveSession } from '../services/session';
import { onReconnect } from '../services/net';

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

  /**
   * Start-up: with tokens on the phone the user is signed in straight away from the saved profile (works
   * offline); the server copy is fetched in the background and the access token refreshed when expired.
   * Only the server rejecting the session (services/api.js) signs the user out.
   */
  initialize: async () => {
    setSessionExpiredHandler(() => {
      clearSession();
      set({ user: null, isAuthenticated: false });
    });
    get().reloadCatalog();
    if (await tokens.load()) {
      const saved = await loadSession();
      if (saved?.user) {
        setCacheScope(saved.user.id);
        set({ user: saved.user, isAuthenticated: true, isLoading: false });
      }
      await get().syncUser();
    }
    set({ isLoading: false });
    if (!get()._net) set({ _net: onReconnect(() => get().isAuthenticated && (get().syncUser(), get().reloadCatalog())) });
  },

  /** Refresh the profile from the server; offline keeps the saved copy. */
  syncUser: async () => {
    try {
      const r = await authAPI.me();
      setCacheScope(r.data.user.id);
      set({ user: r.data.user, isAuthenticated: true });
      saveSession({ user: r.data.user });
    } catch {
      /* offline or server trouble: stay signed in with the saved profile */
    }
  },

  sendOtp: (phone) => authAPI.sendOtp(phone),

  verifyOtp: async (phone, otp) => {
    const r = await authAPI.verifyOtp(phone, otp, Platform.OS);
    await tokens.save(r.data);
    setCacheScope(r.data.user.id);
    set({ user: r.data.user, isAuthenticated: true });
    saveSession({ user: r.data.user });
    return r.data;
  },

  setUser: (user) => {
    set({ user });
    if (user) saveSession({ user });
  },

  logout: async () => {
    try {
      const rt = await tokens.refresh();
      if (rt) await authAPI.logout(rt, globalThis.__gtPushToken);
    } catch {
      /* ignore */
    }
    await tokens.clear();
    await clearSession();
    await clearCache();
    setCacheScope(null);
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
