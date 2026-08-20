import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, FlatList } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { ModalScreen } from './ModalScreen'
import { useTheme } from '../theme/ThemeProvider'
import { useProfile } from '../hooks/useProfile'
import { searchExercises, calcCaloriesBurned, EXERCISE_CATEGORIES, Exercise } from '../lib/exercises'

interface ExerciseModalProps {
  visible: boolean
  onAdd: (entry: { name: string; duration_min?: number; calories_burned: number }) => Promise<void>
  onClose: () => void
}

const QUICK_DURATIONS = [15, 20, 30, 45, 60, 90]

export function ExerciseModal({ visible, onAdd, onClose }: ExerciseModalProps) {
  const theme = useTheme()
  const { profile } = useProfile()
  const weight = profile?.current_weight_kg ?? 70

  const [tab, setTab] = useState<'search' | 'manual'>('search')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [duration, setDuration] = useState('30')
  const [manualName, setManualName] = useState('')
  const [manualCals, setManualCals] = useState('')
  const [manualDuration, setManualDuration] = useState('')
  const [saving, setSaving] = useState(false)

  const results = searchExercises(query).filter((e) => !category || e.category === category)
  const durationNum = Number.parseInt(duration) || 0
  const estimatedCals = selected ? calcCaloriesBurned(selected.met, weight, durationNum) : 0

  function reset() {
    setSelected(null)
    setQuery('')
    setCategory(null)
    setDuration('30')
    setManualName('')
    setManualCals('')
    setManualDuration('')
    setTab('search')
  }

  async function handleAddSearch() {
    if (!selected || durationNum <= 0) return
    setSaving(true)
    await onAdd({ name: selected.name, duration_min: durationNum, calories_burned: estimatedCals })
    setSaving(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    reset()
    onClose()
  }

  async function handleAddManual() {
    const cals = Number.parseFloat(manualCals)
    if (!manualName.trim() || cals <= 0) return
    setSaving(true)
    await onAdd({ name: manualName.trim(), duration_min: Number.parseInt(manualDuration) || undefined, calories_burned: cals })
    setSaving(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    reset()
    onClose()
  }

  return (
    <ModalScreen visible={visible} title="Log Exercise" onClose={() => { reset(); onClose() }}>
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.cardBorder }]}>
        {(['search', 'manual'] as const).map((t) => (
          <Pressable key={t} onPress={() => { Haptics.selectionAsync(); setTab(t) }} style={styles.tabButton}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: tab === t ? theme.colors.calories : theme.colors.textTertiary }}>
              {t === 'search' ? 'Find Exercise' : 'Manual Entry'}
            </Text>
            {tab === t && <View style={[styles.tabUnderline, { backgroundColor: theme.colors.calories }]} />}
          </Pressable>
        ))}
      </View>

      {tab === 'search' ? (
        !selected ? (
          <View style={{ flex: 1 }}>
            <View style={styles.searchArea}>
              <View style={[styles.searchBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
                <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
                <TextInput
                  autoFocus
                  placeholder="Search exercises..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={query}
                  onChangeText={setQuery}
                  style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <Pressable
                  onPress={() => setCategory(null)}
                  style={[styles.pill, { backgroundColor: !category ? theme.colors.calories : theme.colors.backgroundElevated }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: !category ? theme.colors.onAccent : theme.colors.textSecondary }}>All</Text>
                </Pressable>
                {EXERCISE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(category === cat ? null : cat)}
                    style={[styles.pill, { backgroundColor: category === cat ? theme.colors.calories : theme.colors.backgroundElevated }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: category === cat ? theme.colors.onAccent : theme.colors.textSecondary }}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <FlatList
              data={results}
              keyExtractor={(e) => e.name}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setSelected(item) }}
                  style={[styles.exerciseRow, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}
                >
                  <View>
                    <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.exerciseCategory, { color: theme.colors.textTertiary }]}>{item.category}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.calories }}>
                    ~{calcCaloriesBurned(item.met, weight, 30)} kcal/30min
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
            <Pressable onPress={() => setSelected(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chevron-back" size={14} color={theme.colors.textTertiary} />
              <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>Back to list</Text>
            </Pressable>

            <View style={[styles.selectedBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary }}>{selected.name}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 3 }}>{selected.category} · MET {selected.met}</Text>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Duration (minutes)</Text>
              <View style={[styles.amountBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
                <TextInput
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  style={[styles.amountInput, { color: theme.colors.textPrimary }]}
                />
                <Text style={{ fontSize: 12, color: theme.colors.textTertiary, fontWeight: '600' }}>min</Text>
              </View>
              <View style={styles.quickGrid}>
                {QUICK_DURATIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => { Haptics.selectionAsync(); setDuration(String(d)) }}
                    style={[styles.quickButton, { backgroundColor: durationNum === d ? theme.colors.calories : theme.colors.backgroundElevated }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: durationNum === d ? theme.colors.onAccent : theme.colors.textSecondary }}>{d} min</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {durationNum > 0 && (
              <View style={[styles.burnBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="flame" size={20} color={theme.colors.calories} />
                  <View>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>Est. calories burned</Text>
                    <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>Based on {weight}kg body weight</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.calories }}>{estimatedCals}</Text>
              </View>
            )}

            <Pressable
              onPress={handleAddSearch}
              disabled={saving || durationNum <= 0}
              style={[styles.submitButton, { backgroundColor: theme.colors.calories, borderRadius: theme.style.cardRadius - 4, opacity: saving || durationNum <= 0 ? 0.5 : 1 }]}
            >
              {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
              <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Log {estimatedCals} kcal burned</Text>
            </Pressable>
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>Enter exactly what your fitness tracker or app recorded.</Text>
          <TextInput
            placeholder="Exercise name"
            placeholderTextColor={theme.colors.textTertiary}
            value={manualName}
            onChangeText={setManualName}
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Calories burned *</Text>
              <TextInput
                placeholder="e.g. 350"
                placeholderTextColor={theme.colors.textTertiary}
                value={manualCals}
                onChangeText={setManualCals}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Duration (min)</Text>
              <TextInput
                placeholder="optional"
                placeholderTextColor={theme.colors.textTertiary}
                value={manualDuration}
                onChangeText={setManualDuration}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
              />
            </View>
          </View>
          <Pressable
            onPress={handleAddManual}
            disabled={saving || !manualName.trim() || !manualCals}
            style={[styles.submitButton, { backgroundColor: theme.colors.calories, borderRadius: theme.style.cardRadius - 4, opacity: saving || !manualName.trim() || !manualCals ? 0.5 : 1 }]}
          >
            {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
            <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Log Exercise</Text>
          </Pressable>
        </ScrollView>
      )}
    </ModalScreen>
  )
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabUnderline: { height: 2, width: '60%', borderRadius: 1, marginTop: 8 },
  searchArea: { paddingHorizontal: 16, paddingTop: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginRight: 8 },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  exerciseName: { fontSize: 14, fontWeight: '600' },
  exerciseCategory: { fontSize: 11, marginTop: 2 },
  selectedBox: { padding: 14 },
  label: { fontSize: 12, fontWeight: '600' },
  amountBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
  amountInput: { fontSize: 26, fontWeight: '700', textAlign: 'center', minWidth: 80, paddingVertical: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickButton: { flexBasis: '31%', paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  burnBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
})
