import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { ModalScreen } from './ModalScreen'
import { useTheme } from '../theme/ThemeProvider'
import { useFavorites } from '../hooks/useFavorites'
import { calcMacrosFromAmount, convertToGrams } from '../lib/macroCalc'
import type { FoodItem, MeasurementUnit } from '../types'

interface AddAmountModalProps {
  visible: boolean
  food: FoodItem | null
  onConfirm: (amount_g: number) => void
  onClose: () => void
}

type UnitGroup = { label: string; units: { value: MeasurementUnit; label: string }[] }

function getUnitGroups(food: FoodItem): UnitGroup[] {
  const groups: UnitGroup[] = [
    { label: 'Weight', units: [{ value: 'g', label: 'g' }] },
    { label: 'Volume', units: [{ value: 'ml', label: 'ml' }, { value: 'cl', label: 'cl' }, { value: 'L', label: 'L' }] },
    { label: 'Spoon', units: [{ value: 'tbsp', label: 'tbsp' }, { value: 'tsp', label: 'tsp' }] },
  ]
  if (food.piece_weight_g) groups.push({ label: 'Count', units: [{ value: 'piece', label: 'piece' }] })
  return groups
}

const QUICK_AMOUNTS: Record<MeasurementUnit, number[]> = {
  g: [50, 100, 150, 200, 250, 300],
  ml: [50, 100, 150, 200, 250, 330],
  cl: [5, 10, 15, 20, 25, 33],
  L: [0.25, 0.33, 0.5, 0.75, 1, 1.5],
  tbsp: [1, 2, 3, 4, 5, 6],
  tsp: [1, 2, 3, 4, 5, 6],
  piece: [1, 2, 3, 4, 5, 6],
}

function defaultAmountForUnit(unit: MeasurementUnit): string {
  if (unit === 'piece') return '1'
  if (unit === 'L') return '0.5'
  return '100'
}

export function AddAmountModal({ visible, food, onConfirm, onClose }: AddAmountModalProps) {
  const theme = useTheme()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [unit, setUnit] = useState<MeasurementUnit>('g')
  const [amount, setAmount] = useState('100')

  if (!food) return null

  const fav = isFavorite(food)
  const amountNum = Number.parseFloat(amount) || 0
  const amountInGrams = convertToGrams(amountNum, unit, food.piece_weight_g)
  const macros = calcMacrosFromAmount(food, amountInGrams)
  const unitGroups = getUnitGroups(food)

  function handleUnitChange(newUnit: MeasurementUnit) {
    Haptics.selectionAsync()
    setUnit(newUnit)
    setAmount(defaultAmountForUnit(newUnit))
  }

  function handleConfirm() {
    if (amountInGrams <= 0) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onConfirm(amountInGrams)
    setUnit('g')
    setAmount('100')
  }

  const unitLabel = unit === 'piece' ? `piece${amountNum === 1 ? '' : 's'} (≈${food.piece_weight_g}g each)` : unit

  return (
    <ModalScreen visible={visible} title="Set Amount" onClose={onClose} leadingIcon="chevron-back">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View style={[styles.foodInfo, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.foodName, { color: theme.colors.textPrimary }]}>{food.name}</Text>
            <Text style={[styles.foodMeta, { color: theme.colors.textTertiary }]}>per 100g: {food.calories_100g} kcal</Text>
          </View>
          <Pressable onPress={() => { Haptics.selectionAsync(); toggleFavorite(food) }}>
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? theme.colors.danger : theme.colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Unit</Text>
          {unitGroups.map((group) => (
            <View key={group.label} style={styles.unitGroupRow}>
              <Text style={[styles.unitGroupLabel, { color: theme.colors.textTertiary }]}>{group.label}</Text>
              <View style={styles.unitButtons}>
                {group.units.map((u) => (
                  <Pressable
                    key={u.value}
                    onPress={() => handleUnitChange(u.value)}
                    style={[styles.unitButton, { backgroundColor: unit === u.value ? theme.colors.accent : theme.colors.backgroundElevated }]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: unit === u.value ? theme.colors.onAccent : theme.colors.textSecondary }}>
                      {u.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Amount</Text>
          <View style={[styles.amountBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={[styles.amountInput, { color: theme.colors.textPrimary }]}
            />
            <Text style={[styles.amountUnit, { color: theme.colors.textTertiary }]}>{unit}</Text>
          </View>
          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS[unit].map((a) => (
              <Pressable
                key={a}
                onPress={() => { Haptics.selectionAsync(); setAmount(String(a)) }}
                style={[styles.quickButton, { backgroundColor: amountNum === a ? theme.colors.accent : theme.colors.backgroundElevated }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: amountNum === a ? theme.colors.onAccent : theme.colors.textSecondary }}>
                  {a} {unit}
                </Text>
              </Pressable>
            ))}
          </View>
          {unit !== 'g' && amountInGrams > 0 ? (
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary, textAlign: 'center' }}>≈ {Math.round(amountInGrams)}g</Text>
          ) : null}
        </View>

        {amountInGrams > 0 && (
          <View style={[styles.previewBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>
              Nutritional values for {amountNum} {unitLabel}
            </Text>
            <View style={styles.previewGrid}>
              <View style={[styles.previewCell, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.previewValue, { color: theme.colors.calories }]}>{macros.calories}</Text>
                <Text style={[styles.previewLabel, { color: theme.colors.textTertiary }]}>Calories</Text>
              </View>
              <View style={[styles.previewCell, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.previewValue, { color: theme.colors.protein }]}>{macros.protein_g}g</Text>
                <Text style={[styles.previewLabel, { color: theme.colors.textTertiary }]}>Protein</Text>
              </View>
              <View style={[styles.previewCell, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.previewValue, { color: theme.colors.carbs }]}>{macros.carbs_g}g</Text>
                <Text style={[styles.previewLabel, { color: theme.colors.textTertiary }]}>Carbs</Text>
              </View>
              <View style={[styles.previewCell, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.previewValue, { color: theme.colors.fat }]}>{macros.fat_g}g</Text>
                <Text style={[styles.previewLabel, { color: theme.colors.textTertiary }]}>Fat</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.cardBorder }]}>
        <Pressable
          onPress={handleConfirm}
          disabled={amountInGrams <= 0}
          style={[styles.confirmButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4, opacity: amountInGrams <= 0 ? 0.5 : 1 }]}
        >
          <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Add to Log</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.onAccent} />
        </Pressable>
      </View>
    </ModalScreen>
  )
}

const styles = StyleSheet.create({
  foodInfo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 14, gap: 10 },
  foodName: { fontSize: 15, fontWeight: '700' },
  foodMeta: { fontSize: 11, marginTop: 3 },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
  unitGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unitGroupLabel: { fontSize: 11, width: 48 },
  unitButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  unitButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  amountBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '700', textAlign: 'center', paddingVertical: 14 },
  amountUnit: { fontSize: 13, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickButton: { flexBasis: '31%', paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  previewBox: { padding: 14, gap: 10 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  previewCell: { flexBasis: '47%', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  previewValue: { fontSize: 18, fontWeight: '700' },
  previewLabel: { fontSize: 11, marginTop: 2 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
})
