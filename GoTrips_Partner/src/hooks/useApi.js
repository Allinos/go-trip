import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errorMessage } from '../api/client';
import { readCache, writeCache } from '../api/cache';
import { onReconnect } from '../api/net';

/**
 * Data-fetching hook: loads on mount and when the screen regains focus.
 * With { cacheKey } it shows the last saved response immediately (also offline)
 * and refreshes in the background (stale-while-revalidate).
 */
export function useApi(fn, deps = [], { focus = true, cacheKey } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const first = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const hasData = useRef(false);

  const load = useCallback(
    async (isRefresh) => {
      if (isRefresh) setRefreshing(true);
      try {
        const r = await fnRef.current();
        setData(r?.data ?? r);
        setMeta(r?.meta ?? null);
        setError(null);
        setStale(false);
        hasData.current = true;
        if (cacheKey) writeCache(cacheKey, r?.data ?? r, r?.meta ?? null);
      } catch (e) {
        // Keep showing cached data when offline; only surface the error if there is nothing to show.
        if (hasData.current) setStale(true);
        else setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    let cancelled = false;
    hasData.current = false;
    (async () => {
      if (cacheKey) {
        const c = await readCache(cacheKey);
        if (c && !cancelled) {
          setData(c.data);
          setMeta(c.meta);
          setLoading(false);
          hasData.current = true;
        }
      }
      if (!cancelled) load();
    })();
    return () => {
      cancelled = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // Connection restored: refresh what is on screen (cached data stays visible meanwhile).
  useEffect(() => onReconnect(() => load()), [load]);

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (focus) load();
    }, [focus, load])
  );

  return { data, meta, error, loading, refreshing, stale, reload: () => load(), refresh: () => load(true), setData };
}
