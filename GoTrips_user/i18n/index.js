/**
 * Tiny i18n: English text is the key, Assamese is looked up in as.json.
 *   t('Save')                       → 'সংৰক্ষণ কৰক'
 *   t('Pay {0} securely', [amount]) → placeholders by position (or by name with an object)
 * Missing translations fall back to English, so nothing ever shows a raw key.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import as from "./as.json";

const STORE_KEY = 'gt_lang';
const DICTS = { as };
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
];

let lang = 'en';
const listeners = new Set();

export function t(key, args) {
  if (typeof key !== 'string') return key;
  let s = (DICTS[lang] && DICTS[lang][key]) || key;
  if (args) s = s.replace(/\{(\w+)\}/g, (m, k) => (args[k] != null ? String(args[k]) : m));
  return s;
}

export const getLang = () => lang;
/** Locale for dates / numbers. */
export const locale = () => (lang === 'as' ? 'as-IN' : 'en-IN');

export async function loadLang() {
  try {
    const v = await AsyncStorage.getItem(STORE_KEY);
    if (v && (v === 'en' || DICTS[v])) lang = v;
  } catch {
    /* keep default */
  }
  return lang;
}

export async function setLang(v) {
  lang = v;
  listeners.forEach((f) => f(v));
  try {
    await AsyncStorage.setItem(STORE_KEY, v);
  } catch {
    /* ignore */
  }
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
