import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en.json';
import es from '@/locales/es.json';

const LANG_KEY = 'app.lang';

function detectLocale(): 'en' | 'es' {
  try {
    const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
    return tag.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

// Synchronous init at module load. This must complete BEFORE any component
// calls useTranslation() — otherwise react-i18next crashes inside its
// internal useEffect with "Cannot read properties of undefined (reading
// 'length')". Awaiting AsyncStorage made init async, which raced screen
// mounts whenever the Root Layout rendered its navigator on first paint.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: detectLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

// Reconcile the persisted language preference. Safe to await — by the time
// this resolves i18n already has a working language to render with.
export async function initI18n() {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (
      stored &&
      stored !== i18n.language &&
      (stored === 'en' || stored === 'es')
    ) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // Stay on the detected language.
  }
}

export async function setLanguage(lng: 'en' | 'es') {
  await AsyncStorage.setItem(LANG_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
