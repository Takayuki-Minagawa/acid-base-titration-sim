import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ja from './locales/ja.json'
import en from './locales/en.json'

const LANG_KEY = 'lang'

function storedLang(): string {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === 'ja' || v === 'en') return v
  } catch { /* storage unavailable */ }
  return 'ja'
}

// Keep <html lang> and the tab title in sync with the UI language
i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng
  document.title = i18n.t('title')
  try { localStorage.setItem(LANG_KEY, lng) } catch { /* storage unavailable */ }
})

i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: ja },
    en: { translation: en },
  },
  lng: storedLang(),
  fallbackLng: 'ja',
  interpolation: { escapeValue: false },
})

export default i18n
