import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { ModalScreen } from './ModalScreen'
import { useTheme } from '../theme/ThemeProvider'
import { useWeightLog } from '../hooks/useWeightLog'
import { useUnitsStore } from '../store/useUnitsStore'
import { weightUnitLabel, displayValueToKg, weightBounds } from '../lib/units'

interface LogWeightModalProps {
  visible: boolean
  onClose: () => void
}

export function LogWeightModal({ visible, onClose }: LogWeightModalProps) {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const { addEntry } = useWeightLog()
  const { system } = useUnitsStore()
  const weightUnit = weightUnitLabel(system)

  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setWeight('')
      setDate(new Date())
      setNotes('')
      setShowDatePicker(false)
    }
  }, [visible])

  async function handleSave() {
    const value = Number.parseFloat(weight)
    const { min, max } = weightBounds(system)
    if (!value || value < min || value > max) return
    const kg = displayValueToKg(value, system)
    setSaving(true)
    const { error } = await addEntry(kg, date.toISOString().split('T')[0], notes || undefined)
    setSaving(false)
    if (error) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onClose()
  }

  return (
    <ModalScreen visible={visible} title={t('progress.logWeightTitle')} onClose={onClose}>
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            autoFocus
            placeholder={t('progress.weightPlaceholder', { unit: weightUnit })}
            placeholderTextColor={theme.colors.textTertiary}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1, backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
          />
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8, justifyContent: 'center' }]}
          >
            <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }}>{date.toLocaleDateString(i18n.language)}</Text>
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setDate(d) }}
          />
        )}
        <TextInput
          placeholder={t('progress.notesPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        <Pressable
          onPress={handleSave}
          disabled={saving || !weight}
          style={[styles.saveButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8, opacity: saving || !weight ? 0.5 : 1 }]}
        >
          {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
          <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>{t('progress.save')}</Text>
        </Pressable>
      </View>
    </ModalScreen>
  )
}

const styles = StyleSheet.create({
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
})
