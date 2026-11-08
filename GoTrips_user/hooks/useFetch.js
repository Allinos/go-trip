import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from '../services/api';
import { readCache, writeCache } from '../services/cache';

/**
 * Load data on mount + when the screen regains focus.
 * With { cacheKey } the last saved response is shown instantly (also offline), then refreshed.
 */
export default function useFetch(fn, deps = [], { refocus = true, enabled = true, cacheKey } = {}) {
  const [state, setState] = useState({ data: null, meta: null, error: null, loading: enabled, refreshing: false, stale: false });
  const ref = useRef(fn);
  ref.current = fn;
  const first = useRef(true);
  const has = useRef(false);
  const load = useCallback(
    async (refreshing) => {
      setState((s) => ({ ...s, refreshing: !!refreshing, loading: s.data == null }));
      try {
        const r = await ref.current();
        has.current = true;
        if (cacheKey) writeCache(cacheKey, r?.data ?? r, r?.meta ?? null);
        setState({ data: r?.data ?? r, meta: r?.meta ?? null, error: null, loading: false, refreshing: false, stale: false });
      } catch (e) {
        setState((s) => (has.current ? { ...s, stale: true, loading: false, refreshing: false } : { ...s, error: errorMessage(e), loading: false, refreshing: false }));
      }
    },
    [cacheKey]
  );
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    has.current = false;
    (async () => {
      if (cacheKey) {
        const c = await readCache(cacheKey);
        if (c && !cancelled) {
          has.current = true;
          setState((s) => ({ ...s, data: c.data, meta: c.meta, loading: false }));
        }
      }
      if (!cancelled) load();
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (refocus && enabled) load();
    }, [refocus, enabled, load])
  );
  return { ...state, reload: () => load(), refresh: () => load(true) };
}
