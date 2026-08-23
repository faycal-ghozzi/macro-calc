import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { ModalScreen } from './ModalScreen'
import { useTheme } from '../theme/ThemeProvider'
import { roundTo2 } from '../lib/macroCalc'
import { useUnitsStore } from '../store/useUnitsStore'
import { gToDisplayValue, displayValueToG, massUnitLabel } from '../lib/units'
import type { FoodLog } from '../types'

interface EditFoodLogModalProps {
  visible: boolean
  entry: FoodLog | null
  onSave: (updates: Partial<FoodLog>) => Promise<void>
  onClose: () => void
}

function MacroField({ label, value, onChange, color }: { label: string; value: string; onChange: (v: string) => void; color: string }) {
  const theme = useTheme()
  return (
    <View style={{ flexBasis: '47%', gap: 5 }}>
      <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={[styles.field, { backgroundColor: theme.colors.card, color, borderRadius: theme.style.cardRadius - 8 }]}
      />
    </View>
  )
}

export function EditFoodLogModal({ visible, entry, onSave, onClose }: EditFoodLogModalProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const { system } = useUnitsStore()
  const massUnit = massUnitLabel(system)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setName(entry.food_name)
      setAmount(String(roundTo2(gToDisplayValue(entry.amount_g, system))))
      setCalories(String(roundTo2(entry.calories)))
      setProtein(String(roundTo2(gToDisplayValue(entry.protein_g, system))))
      setCarbs(String(roundTo2(gToDisplayValue(entry.carbs_g, system))))
      setFat(String(roundTo2(gToDisplayValue(entry.fat_g, system))))
      setFiber(String(roundTo2(gToDisplayValue(entry.fiber_g ?? 0, system))))
    }
  }, [entry, system])

  if (!entry) return null

  async function handleSave() {
    setSaving(true)
    await onSave({
      food_name: name.trim() || entry!.food_name,
      amount_g: displayValueToG(Number.parseFloat(amount) || gToDisplayValue(entry!.amount_g, system), system),
      calories: Number.parseFloat(calories) || 0,
      protein_g: displayValueToG(Number.parseFloat(protein) || 0, system),
      carbs_g: displayValueToG(Number.parseFloat(carbs) || 0, system),
      fat_g: displayValueToG(Number.parseFloat(fat) || 0, system),
      fiber_g: displayValueToG(Number.parseFloat(fiber) || 0, system),
    })
    setSaving(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onClose()
  }

  return (
    <ModalScreen visible={visible} title={t('editFoodLog.title')} onClose={onClose} leadingIcon="chevron-back">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('editFoodLog.foodNameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('editFoodLog.amountLabel', { unit: massUnit })}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
          />
        </View>
        <View style={[styles.macroBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('editFoodLog.nutritionalValues')}</Text>
          <View style={styles.macroGrid}>
            <MacroField label={t('editFoodLog.caloriesLabel')} value={calories} onChange={setCalories} color={theme.colors.calories} />
            <MacroField label={t('editFoodLog.proteinLabel', { unit: massUnit })} value={protein} onChange={setProtein} color={theme.colors.protein} />
            <MacroField label={t('editFoodLog.carbsLabel', { unit: massUnit })} value={carbs} onChange={setCarbs} color={theme.colors.carbs} />
            <MacroField label={t('editFoodLog.fatLabel', { unit: massUnit })} value={fat} onChange={setFat} color={theme.colors.fat} />
          </View>
          <MacroField label={t('editFoodLog.fiberLabel', { unit: massUnit })} value={fiber} onChange={setFiber} color={theme.colors.textPrimary} />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.colors.cardBorder }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
        >
          {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : <Ionicons name="checkmark" size={18} color={theme.colors.onAccent} />}
          <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>{t('editFoodLog.saveChanges')}</Text>
        </Pressable>
      </View>
    </ModalScreen>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600' },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  macroBox: { padding: 14, gap: 12 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '700' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
})
