import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Platform, Alert, Linking } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useNotificationStore, ReminderMode } from '../store/useNotificationStore'
import { requestNotificationPermission, syncMealReminders, cancelAllMealReminders } from '../lib/notifications'

type TimeKey = 'breakfastTime' | 'lunchTime' | 'dinnerTime' | 'singleTime'

function parseTime(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

function formatTime(hhmm: string, locale: string): string {
  return parseTime(hhmm).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}

export function MealReminderSettings() {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const { mode, breakfastTime, lunchTime, dinnerTime, singleTime, setMode, setTime } = useNotificationStore()
  const [pickerKey, setPickerKey] = useState<TimeKey | null>(null)

  const MODES: { value: ReminderMode; labelKey: string }[] = [
    { value: 'off', labelKey: 'profile.remindersOff' },
    { value: 'three', labelKey: 'profile.remindersThree' },
    { value: 'one', labelKey: 'profile.remindersOne' },
  ]

  async function handleModeChange(next: ReminderMode) {
    Haptics.selectionAsync()
    setPickerKey(null)
    if (next === 'off') {
      setMode('off')
      await cancelAllMealReminders()
      return
    }
    const granted = await requestNotificationPermission()
    if (!granted) {
      Alert.alert(t('profile.notifPermissionDeniedTitle'), t('profile.notifPermissionDeniedBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.openSettings'), onPress: () => Linking.openSettings() },
      ])
      return
    }
    setMode(next)
    await syncMealReminders({ mode: next, breakfastTime, lunchTime, dinnerTime, singleTime })
  }

  async function handleTimeChange(key: TimeKey, date?: Date) {
    if (Platform.OS === 'android') setPickerKey(null)
    if (!date) return
    const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    setTime(key, hhmm)
    await syncMealReminders({
      mode,
      breakfastTime: key === 'breakfastTime' ? hhmm : breakfastTime,
      lunchTime: key === 'lunchTime' ? hhmm : lunchTime,
      dinnerTime: key === 'dinnerTime' ? hhmm : dinnerTime,
      singleTime: key === 'singleTime' ? hhmm : singleTime,
    })
  }

  const times: Record<TimeKey, string> = { breakfastTime, lunchTime, dinnerTime, singleTime }
  const rows: { key: TimeKey; labelKey: string }[] =
    mode === 'three'
      ? [
          { key: 'breakfastTime', labelKey: 'profile.breakfastTime' },
          { key: 'lunchTime', labelKey: 'profile.lunchTime' },
          { key: 'dinnerTime', labelKey: 'profile.dinnerTime' },
        ]
      : mode === 'one'
      ? [{ key: 'singleTime', labelKey: 'profile.reminderTime' }]
      : []

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {MODES.map((m) => (
          <Pressable
            key={m.value}
            onPress={() => handleModeChange(m.value)}
            style={[
              styles.chip,
              { flex: 1, backgroundColor: mode === m.value ? theme.colors.accent : theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'center', color: mode === m.value ? theme.colors.onAccent : theme.colors.textSecondary }}>
              {t(m.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {rows.map((row) => (
        <Pressable
          key={row.key}
          onPress={() => { Haptics.selectionAsync(); setPickerKey(pickerKey === row.key ? null : row.key) }}
          style={[styles.timeRow, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>{t(row.labelKey)}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>{formatTime(times[row.key], i18n.language)}</Text>
        </Pressable>
      ))}

      {pickerKey && (
        <DateTimePicker
          value={parseTime(times[pickerKey])}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => handleTimeChange(pickerKey, date)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 10, paddingHorizontal: 6 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
})
