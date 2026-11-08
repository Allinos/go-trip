import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { partnerApi } from '../api';
import { errorMessage } from '../api/client';
import { t } from '../i18n';

/**
 * Low-cost live location: while sharing, the phone sends its position every ~30 s / 50 m
 * to the API, which keeps only the latest point. Passengers with a confirmed booking open it in Google Maps.
 * Works while the app is open (foreground) — no background tracking service, no extra cost.
 */
const Ctx = createContext(null);

export function LocationProvider({ children, enabled }) {
  const [share, setShare] = useState(null); // server state
  const [error, setError] = useState(null);
  const watcher = useRef(null);
  const lastSent = useRef(0);

  const stopWatch = () => {
    watcher.current?.remove?.();
    watcher.current = null;
  };

  const startWatch = useCallback(async () => {
    stopWatch();
    watcher.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 30_000, distanceInterval: 50 }, async (pos) => {
      if (Date.now() - lastSent.current < 25_000) return;
      lastSent.current = Date.now();
      try {
        const r = await partnerApi.sendLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined });
        if (!r.data.isSharing) {
          stopWatch();
          setShare((x) => (x ? { ...x, isSharing: false } : x));
        } else setShare((x) => ({ ...x, lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: new Date().toISOString() }));
      } catch {
        /* offline: try again on next fix */
      }
    });
  }, []);

  // Restore state on launch / when app returns to foreground.
  const sync = useCallback(async () => {
    try {
      const r = await partnerApi.location();
      setShare(r.data);
      const active = r.data?.isSharing && (!r.data.expiresAt || new Date(r.data.expiresAt) > new Date());
      if (active && !watcher.current) {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) startWatch();
      }
      if (!active) stopWatch();
    } catch {
      /* ignore */
    }
  }, [startWatch]);

  useEffect(() => {
    if (!enabled) return undefined;
    sync();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && sync());
    return () => {
      sub.remove();
      stopWatch();
    };
  }, [enabled, sync]);

  const start = useCallback(
    async ({ hours = 4, tripId } = {}) => {
      setError(null);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        const msg = 'Location permission is needed to share your location.';
        setError(msg);
        if (Platform.OS !== 'web' && !perm.canAskAgain) Linking.openSettings();
        throw new Error(msg);
      }
      let coords = {};
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        /* first point will come from the watcher */
      }
      try {
        const r = await partnerApi.startSharing({ hours, tripId: tripId || null, ...coords });
        setShare(r.data);
        lastSent.current = Date.now();
        await startWatch();
        return r.data;
      } catch (e) {
        setError(errorMessage(e));
        throw e;
      }
    },
    [startWatch]
  );

  const stop = useCallback(async () => {
    stopWatch();
    await partnerApi.stopSharing();
    setShare((x) => (x ? { ...x, isSharing: false } : x));
  }, []);

  const isSharing = !!share?.isSharing && (!share.expiresAt || new Date(share.expiresAt) > new Date());
  return <Ctx.Provider value={{ share, isSharing, start, stop, error, sync }}>{children}</Ctx.Provider>;
}

export const useLocationShare = () => useContext(Ctx) || { isSharing: false, start: async () => {}, stop: async () => {} };
