import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getStoredProfileLanguage,
  LANGUAGE_EVENT,
  setStoredProfileLanguage,
} from './profileLanguage.js';
import { catalogs, localeByLanguage } from './catalogs.js';

function interpolate(template, values = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));
}

function translate(language, key, values) {
  const template = catalogs[language]?.[key] ?? catalogs.en[key] ?? key;
  return interpolate(template, values);
}

const fallbackValue = {
  language: 'en',
  locale: localeByLanguage.en,
  setLanguage: () => {},
  t: (key, values) => translate('en', key, values),
  formatDateTime: (value, options) => new Intl.DateTimeFormat(localeByLanguage.en, options).format(new Date(value)),
  formatNumber: (value, options) => new Intl.NumberFormat(localeByLanguage.en, options).format(value),
};

const I18nContext = createContext(fallbackValue);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredProfileLanguage);

  useEffect(() => {
    const syncLanguage = (event) => {
      setLanguageState(event.detail?.language || getStoredProfileLanguage());
    };
    window.addEventListener(LANGUAGE_EVENT, syncLanguage);
    window.addEventListener('storage', syncLanguage);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const locale = localeByLanguage[language] || localeByLanguage.en;
    return {
      language,
      locale,
      setLanguage: (nextLanguage) => {
        const saved = setStoredProfileLanguage(nextLanguage);
        setLanguageState(saved);
      },
      t: (key, values) => translate(language, key, values),
      formatDateTime: (input, options) => (
        new Intl.DateTimeFormat(locale, options).format(new Date(input))
      ),
      formatNumber: (input, options) => (
        new Intl.NumberFormat(locale, options).format(input)
      ),
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
