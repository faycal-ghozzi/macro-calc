export interface LanguageInfo {
  code: string
  englishName: string
  nativeName: string
  rtl: boolean
}

// Order matches how these should appear in the language picker.
export const LANGUAGES: LanguageInfo[] = [
  { code: 'en-US', englishName: 'English (US)', nativeName: 'English (US)', rtl: false },
  { code: 'en-GB', englishName: 'English (UK)', nativeName: 'English (UK)', rtl: false },
  { code: 'fr', englishName: 'French', nativeName: 'Français', rtl: false },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', rtl: false },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', rtl: false },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', rtl: false },
  { code: 'zh', englishName: 'Chinese', nativeName: '中文', rtl: false },
]

export const DEFAULT_LANGUAGE = 'en-US'

export function isRtlLanguage(code: string): boolean {
  return LANGUAGES.find((l) => l.code === code)?.rtl ?? false
}

// react-native-localize gives full BCP-47 tags (e.g. "en-CA", "fr-FR", "zh-Hans-CN").
// Match by base language first, special-casing the English variants we actually
// ship distinct copy for - everything else English-ish falls back to en-US.
const ENGLISH_GB_REGIONS = new Set(['GB', 'IE', 'AU', 'NZ', 'ZA', 'IN'])

export function resolveSupportedLanguage(languageTag: string, languageCode: string, countryCode: string): string {
  if (languageCode === 'en') {
    return ENGLISH_GB_REGIONS.has(countryCode) ? 'en-GB' : 'en-US'
  }
  const match = LANGUAGES.find((l) => l.code === languageCode || l.code === languageTag)
  return match?.code ?? DEFAULT_LANGUAGE
}
