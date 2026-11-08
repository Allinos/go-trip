import { useEffect, useState } from 'react';
import { getLang, onLangChange, setLang } from '../i18n';
import { meApi } from '../api';

/**
 * [lang, changeLanguage]. Changing the language re-renders the app and saves it on the server,
 * so push notifications and SMS arrive in the same language.
 */
export function useLanguage() {
  const [lang, setState] = useState(getLang());
  useEffect(() => onLangChange(setState), []);
  const change = async (code, { syncServer = true } = {}) => {
    await setLang(code);
    if (syncServer) meApi.update({ language: code }).catch(() => {}); // ignored when logged out
  };
  return [lang, change];
}
