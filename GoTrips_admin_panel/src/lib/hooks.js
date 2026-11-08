import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from './api';
import { useToast } from '../components/ui';

/** Filters stored in the URL so lists are shareable and survive refresh. */
export function useFilters(defaults = {}) {
  const [sp, setSp] = useSearchParams();
  const filters = { ...defaults, ...Object.fromEntries(sp.entries()) };
  const set = (patch) => {
    const next = { ...filters, ...patch };
    if (!('page' in patch)) next.page = 1;
    const clean = Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== '' && v != null && !(k in defaults && defaults[k] === v && k !== 'page')));
    if (clean.page === 1 || clean.page === '1') delete clean.page;
    setSp(clean, { replace: true });
  };
  return [filters, set];
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const useList = (key, path, params) => useQuery({ queryKey: [key, params], queryFn: () => api(path, { params }), placeholderData: (prev) => prev });

export const useGet = (key, path, opts = {}) => useQuery({ queryKey: Array.isArray(key) ? key : [key], queryFn: async () => (await api(path)).data, ...opts });

/** Mutation with toast + cache invalidation. */
export function useAction(fn, { success, invalidate = [] } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (success) toast(success, 'success');
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast(e.message, 'error'),
  });
}
