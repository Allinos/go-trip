import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from '../services/api';

/** Load data on mount + when the screen regains focus. */
export default function useFetch(fn, deps = [], { refocus = true, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, error: null, loading: enabled, refreshing: false });
  const ref = useRef(fn);
  ref.current = fn;
  const first = useRef(true);
  const load = useCallback(async (refreshing) => {
    setState((s) => ({ ...s, refreshing: !!refreshing, loading: s.data == null }));
    try {
      const r = await ref.current();
      setState({ data: r?.data ?? r, meta: r?.meta ?? null, error: null, loading: false, refreshing: false });
    } catch (e) {
      setState((s) => ({ ...s, error: errorMessage(e), loading: false, refreshing: false }));
    }
  }, []);
  useEffect(() => {
    if (enabled) load();
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
