import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { ModalScreen } from './ModalScreen'
import { useTheme } from '../theme/ThemeProvider'
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
      setAmount(String(entry.amount_g))
      setCalories(String(entry.calories))
      setProtein(String(entry.protein_g))
      setCarbs(String(entry.carbs_g))
      setFat(String(entry.fat_g))
      setFiber(String(entry.fiber_g ?? 0))
    }
  }, [entry])

  if (!entry) return null

  async function handleSave() {
    setSaving(true)
    await onSave({
      food_name: name.trim() || entry!.food_name,
      amount_g: Number.parseFloat(amount) || entry!.amount_g,
      calories: Number.parseFloat(calories) || 0,
      protein_g: Number.parseFloat(protein) || 0,
      carbs_g: Number.parseFloat(carbs) || 0,
      fat_g: Number.parseFloat(fat) || 0,
      fiber_g: Number.parseFloat(fiber) || 0,
    })
    setSaving(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onClose()
  }

  return (
    <ModalScreen visible={visible} title="Edit Entry" onClose={onClose} leadingIcon="chevron-back">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Food name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount (g)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
          />
        </View>
        <View style={[styles.macroBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nutritional values</Text>
          <View style={styles.macroGrid}>
            <MacroField label="Calories (kcal)" value={calories} onChange={setCalories} color={theme.colors.calories} />
            <MacroField label="Protein (g)" value={protein} onChange={setProtein} color={theme.colors.protein} />
            <MacroField label="Carbs (g)" value={carbs} onChange={setCarbs} color={theme.colors.carbs} />
            <MacroField label="Fat (g)" value={fat} onChange={setFat} color={theme.colors.fat} />
          </View>
          <MacroField label="Fiber (g)" value={fiber} onChange={setFiber} color={theme.colors.textPrimary} />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.colors.cardBorder }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
        >
          {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : <Ionicons name="checkmark" size={18} color={theme.colors.onAccent} />}
          <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Save Changes</Text>
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
