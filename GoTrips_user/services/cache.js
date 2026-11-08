/**
 * Client-side response cache (stale-while-revalidate):
 *  - screens show the last data instantly (also when offline), then refresh in the background
 *  - kept in memory + AsyncStorage, scoped per user and language, cleared on logout
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLang } from '../i18n';

const PREFIX = 'gt_c:';
const MAX_AGE = 7 * 86400_000; // never show data older than a week
const mem = new Map();
let scope = 'anon';

export const setCacheScope = (userId) => (scope = userId ? String(userId) : 'anon');
const full = (key) => `${PREFIX}${scope}:${getLang()}:${key}`;

export async function readCache(key) {
  const k = full(key);
  if (mem.has(k)) return mem.get(k);
  try {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (Date.now() - v.at > MAX_AGE) return null;
    mem.set(k, v);
    return v;
  } catch {
    return null;
  }
}

export function writeCache(key, data, meta) {
  const k = full(key);
  const v = { at: Date.now(), data, meta };
  mem.set(k, v);
  AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
}

export async function clearCache() {
  mem.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    /* ignore */
  }
}
