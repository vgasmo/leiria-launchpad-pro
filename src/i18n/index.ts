import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import pt from './locales/pt.json';

const savedLanguage = localStorage.getItem('language') || (navigator.language?.startsWith('en') ? 'en' : 'pt');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    // Enable legacy plural compatibility for keys like `_plural`
    // @ts-expect-error - i18next v25+ expects 'v4' but we need 'v3' for legacy plural support
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
