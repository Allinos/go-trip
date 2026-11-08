import { create } from 'zustand';
import { Platform } from 'react-native';
import { authAPI, catalogAPI, setSessionExpiredHandler, tokens } from '../services/api';

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

  initialize: async () => {
    setSessionExpiredHandler(() => set({ user: null, isAuthenticated: false }));
    catalogAPI.config().then((r) => set({ config: r.data })).catch(() => {});
    catalogAPI.districts().then((r) => set({ districts: r.data })).catch(() => {});
    try {
      if (await tokens.load()) {
        const r = await authAPI.me();
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
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
