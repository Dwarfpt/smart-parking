// Контекст языка — ru/ro/en, сохранение в localStorage
import { createContext, useContext, useState, useCallback } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext(null);

const LANGS = ['ru', 'ro', 'en'];
const LABELS = { ru: 'RU', ro: 'RO', en: 'EN' };

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ru');

  const changeLang = useCallback((l) => {
    if (LANGS.includes(l)) {
      setLang(l);
      localStorage.setItem('lang', l);
    }
  }, []);

  // Функция перевода
  const t = useCallback(
    (key) => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[lang] || entry.ru || key;
    },
    [lang],
  );

  // Локализация полей объекта БД (name → nameRo/nameEn, address → addressRo/addressEn)
  const loc = useCallback(
    (obj, field) => {
      if (!obj) return '';
      if (lang === 'ro') return obj[field + 'Ro'] || obj[field] || '';
      if (lang === 'en') return obj[field + 'En'] || obj[field] || '';
      return obj[field] || '';
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, loc, LANGS, LABELS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
