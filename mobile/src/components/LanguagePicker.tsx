import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useLocaleStore } from '../store/useLocaleStore'
import { LANGUAGES } from '../i18n/languages'
import i18n, { detectSystemLanguage, applyRtlForLanguage } from '../i18n'

export function LanguagePicker() {
  const theme = useTheme()
  const { t } = useTranslation()
  const languageOverride = useLocaleStore((s) => s.languageOverride)
  const setLanguageOverride = useLocaleStore((s) => s.setLanguageOverride)

  async function select(code: string | null) {
    Haptics.selectionAsync()
    setLanguageOverride(code)
    const resolved = code ?? detectSystemLanguage()
    await i18n.changeLanguage(resolved)
    applyRtlForLanguage(resolved)
  }

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        onPress={() => select(null)}
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.backgroundElevated,
            borderRadius: theme.style.cardRadius - 8,
            borderWidth: languageOverride === null ? 1.5 : 0,
            borderColor: theme.colors.accent,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>{t('profile.systemDefault')}</Text>
        </View>
        {languageOverride === null ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} /> : null}
      </Pressable>

      {LANGUAGES.map((lang) => {
        const selected = languageOverride === lang.code
        return (
          <Pressable
            key={lang.code}
            onPress={() => select(lang.code)}
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.backgroundElevated,
                borderRadius: theme.style.cardRadius - 8,
                borderWidth: selected ? 1.5 : 0,
                borderColor: theme.colors.accent,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>{lang.nativeName}</Text>
              {lang.nativeName !== lang.englishName && (
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 }}>{lang.englishName}</Text>
              )}
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
})
