import { createContext, useContext, useState } from 'react';
import AS from './as.json';

/** English text is the key; Assamese comes from as.json (missing lines fall back to English). */
let lang = (() => {
  try {
    const saved = localStorage.getItem('gt_lang');
    if (saved === 'en' || saved === 'as') return saved;
  } catch {
    /* private mode */
  }
  return (navigator.language || '').startsWith('as') ? 'as' : 'en';
})();

export const getLang = () => lang;

export function t(key, args) {
  let s = (lang === 'as' && AS[key]) || key;
  if (args) args.forEach((a, i) => (s = s.split(`{${i}}`).join(a)));
  return s;
}

const LangCtx = createContext({ lang, setLang: () => {} });

export function LangProvider({ children }) {
  const [current, setCurrent] = useState(lang);
  const setLang = (v) => {
    lang = v;
    try {
      localStorage.setItem('gt_lang', v);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = v;
    setCurrent(v);
  };
  document.documentElement.lang = current;
  // key={current} re-renders the whole tree in the new language.
  return (
    <LangCtx.Provider value={{ lang: current, setLang }}>
      <div key={current} className={current === 'as' ? 'lang-as' : ''}>
        {children}
      </div>
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
