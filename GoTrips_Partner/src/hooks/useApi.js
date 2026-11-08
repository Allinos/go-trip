import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errorMessage } from '../api/client';

/**
 * Small data-fetching hook: loads on mount and whenever the screen regains focus
 * (so lists are fresh after editing on another screen).
 */
export function useApi(fn, deps = [], { focus = true } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const first = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fnRef.current();
      setData(r?.data ?? r);
      setMeta(r?.meta ?? null);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (focus) load();
    }, [focus, load])
  );

  return { data, meta, error, loading, refreshing, reload: () => load(), refresh: () => load(true), setData };
}
