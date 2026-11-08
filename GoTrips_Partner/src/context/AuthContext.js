import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import { authApi, catalogApi } from '../api';
import { clearTokens, getRefreshToken, loadTokens, saveTokens, setSessionExpiredHandler } from '../api/client';
import { clearCache, readCache, setCacheScope, writeCache } from '../api/cache';
import { onLangChange } from '../i18n';
import { t } from '../i18n';

/**
 * Session state machine:
 *   loading → loggedOut → (OTP) → onboarding (nextStep from API) → ready
 * Onboarding progress always comes from the server, so a partner who closes the app midway
 * resumes at the right step after logging in again (even on another phone).
 */
const AuthContext = createContext(null);
const CatalogContext = createContext({});

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [catalog, setCatalog] = useState({ config: null, districts: [] });

  const applyMe = useCallback((data) => {
    setCacheScope(data.user?.id);
    setUser(data.user);
    setOnboarding(data.onboarding);
    setStatus(data.onboarding?.completed ? 'ready' : 'onboarding');
  }, []);

  const loadCatalog = useCallback(async () => {
    // Show the saved copy immediately (fast start, works offline), then refresh.
    const cached = await readCache('catalog');
    if (cached) setCatalog(cached.data);
    try {
      const [config, districts] = await Promise.all([catalogApi.config(), catalogApi.districts()]);
      const fresh = { config: config.data, districts: districts.data };
      setCatalog(fresh);
      writeCache('catalog', fresh);
    } catch {
      /* keep cached copy; retried on next refresh */
    }
  }, []);

  const refresh = useCallback(async () => {
    const r = await authApi.me();
    applyMe(r.data);
    return r.data;
  }, [applyMe]);

  const logout = useCallback(async (message) => {
    try {
      const rt = await getRefreshToken();
      if (rt) await authApi.logout(rt, globalThis.__gtPushToken);
    } catch {
      /* ignore */
    }
    await clearTokens();
    await clearCache();
    setCacheScope(null);
    setUser(null);
    setOnboarding(null);
    setStatus('loggedOut');
    if (typeof message === 'string') Alert.alert(t("Signed out"), message);
  }, []);

  // Server-provided text (partner types, step labels) is localised: reload it when the language changes.
  useEffect(
    () =>
      onLangChange(() => {
        loadCatalog();
        refresh().catch(() => {});
      }),
    [loadCatalog, refresh]
  );

  useEffect(() => {
    setSessionExpiredHandler((msg) => logout(msg));
    (async () => {
      loadCatalog();
      if (!(await loadTokens())) return setStatus('loggedOut');
      try {
        await refresh();
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) await clearTokens();
        setStatus(e?.response ? 'loggedOut' : 'offline');
      }
    })();
  }, [loadCatalog, logout, refresh]);

  const login = useCallback(
    async (phone, otp) => {
      const r = await authApi.verifyOtp(phone, otp, `${Device.manufacturer || ''} ${Device.modelName || Platform.OS}`.trim());
      await saveTokens(r.data);
      applyMe(r.data);
      if (!catalog.config) loadCatalog();
      return r.data;
    },
    [applyMe, catalog.config, loadCatalog]
  );

  /** Update onboarding from any API response that includes it. */
  const setOnboardingState = useCallback((state) => {
    if (!state) return;
    setOnboarding(state);
    setStatus(state.completed ? 'ready' : 'onboarding');
  }, []);

  const value = useMemo(
    () => ({ status, user, setUser, onboarding, setOnboardingState, refresh, login, logout, retry: () => (setStatus('loading'), refresh().catch(() => setStatus('offline'))) }),
    [status, user, onboarding, setOnboardingState, refresh, login, logout]
  );
  return (
    <AuthContext.Provider value={value}>
      <CatalogContext.Provider value={{ ...catalog, reloadCatalog: loadCatalog }}>{children}</CatalogContext.Provider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useCatalog = () => useContext(CatalogContext);
/** Capabilities of the partner's category (what tabs/features to show). */
export const useCaps = () => {
  const { onboarding } = useAuth();
  const c = onboarding?.category || {};
  return { driver: !!c.hasDriverProfile, vehicles: !!c.canListVehicles, trips: !!c.canCreateTrips, rentals: !!c.canListRentals, goods: !!c.canViewGoodsOrders, name: c.name, code: c.code };
};
