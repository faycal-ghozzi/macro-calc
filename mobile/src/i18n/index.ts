import { useEffect } from 'react'
import { Alert, I18nManager } from 'react-native'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as RNLocalize from 'react-native-localize'
import { useLocaleStore } from '../store/useLocaleStore'
import { resolveSupportedLanguage, isRtlLanguage, DEFAULT_LANGUAGE } from './languages'

import enUS from './locales/en-US.json'
import enGB from './locales/en-GB.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import ru from './locales/ru.json'
import ar from './locales/ar.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zh from './locales/zh.json'

const resources = {
  'en-US': { translation: enUS },
  'en-GB': { translation: enGB },
  fr: { translation: fr },
  de: { translation: de },
  ru: { translation: ru },
  ar: { translation: ar },
  ja: { translation: ja },
  ko: { translation: ko },
  zh: { translation: zh },
}

export function detectSystemLanguage(): string {
  const best = RNLocalize.getLocales()[0]
  if (!best) return DEFAULT_LANGUAGE
  return resolveSupportedLanguage(best.languageTag, best.languageCode, best.countryCode)
}

export function resolveEffectiveLanguage(): string {
  return useLocaleStore.getState().languageOverride ?? detectSystemLanguage()
}

i18next.use(initReactI18next).init({
  resources,
  lng: resolveEffectiveLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
})

// If the persisted override finishes hydrating from AsyncStorage after this
// module already picked a (possibly stale) initial language, or the user
// changes their override, keep i18next in sync.
useLocaleStore.subscribe((state) => {
  i18next.changeLanguage(state.languageOverride ?? detectSystemLanguage())
})

// I18nManager's RTL flag is native and OS-persisted - it only takes effect
// after a JS bundle reload, which on both platforms means the user has to
// manually close and reopen the app (iOS doesn't allow apps to self-restart,
// so this stays a one-time prompt rather than an in-app restart button).
export function applyRtlForLanguage(languageCode: string) {
  const shouldBeRtl = isRtlLanguage(languageCode)
  if (I18nManager.isRTL === shouldBeRtl) return
  I18nManager.allowRTL(shouldBeRtl)
  I18nManager.forceRTL(shouldBeRtl)
  Alert.alert(i18next.t('common.restartRequiredTitle'), i18next.t('common.restartRequiredBody'))
}

// Mounted once at the app root - checks the RTL flag against the effective
// language after the persisted override has hydrated (covers a fresh install
// whose system language is Arabic, where the native flag still defaults false).
export function useSyncRtlOnLaunch() {
  useEffect(() => {
    const check = () => applyRtlForLanguage(resolveEffectiveLanguage())
    if (useLocaleStore.persist.hasHydrated()) {
      check()
      return
    }
    return useLocaleStore.persist.onFinishHydration(check)
  }, [])
}

export default i18next
