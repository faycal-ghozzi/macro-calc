import { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { mirrorChevron } from '../lib/rtl'
import { Card } from './Card'

interface DateRangePickerProps {
  from: Date | null
  to: Date | null
  onChangeFrom: (d: Date | null) => void
  onChangeTo: (d: Date | null) => void
  minDate?: Date
  maxDate?: Date
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function weekdayLabels(locale: string): string[] {
  const sunday = new Date(2024, 0, 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d)
  })
}

// Google-Flights-style two-tap range calendar: tap one day to select just
// that day, tap a second to stretch it into a range (order doesn't matter -
// the earlier one always becomes "from"). A third tap starts a fresh pick.
export function DateRangePicker({ from, to, onChangeFrom, onChangeTo, minDate, maxDate }: DateRangePickerProps) {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [awaitingSecondTap, setAwaitingSecondTap] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(to ?? from ?? maxDate ?? new Date()))
  const [gridWidth, setGridWidth] = useState(0)

  function handleGridLayout(e: LayoutChangeEvent) {
    setGridWidth(e.nativeEvent.layout.width)
  }

  const cellSize = gridWidth > 0 ? Math.floor(gridWidth / 7) : 0
  const labels = useMemo(() => weekdayLabels(i18n.language), [i18n.language])

  const minMonth = minDate ? startOfMonth(minDate) : undefined
  const maxMonth = maxDate ? startOfMonth(maxDate) : undefined
  const canGoPrev = !minMonth || viewMonth.getTime() > minMonth.getTime()
  const canGoNext = !maxMonth || viewMonth.getTime() < maxMonth.getTime()

  function toggle() {
    Haptics.selectionAsync()
    setExpanded((v) => !v)
  }

  function clear() {
    Haptics.selectionAsync()
    setAwaitingSecondTap(false)
    onChangeFrom(null)
    onChangeTo(null)
  }

  function handleDayPress(d: Date) {
    Haptics.selectionAsync()
    if (awaitingSecondTap && from) {
      if (d.getTime() < from.getTime()) { onChangeFrom(d); onChangeTo(from) }
      else { onChangeTo(d) }
      setAwaitingSecondTap(false)
    } else {
      onChangeFrom(d)
      onChangeTo(d)
      setAwaitingSecondTap(true)
    }
  }

  const firstWeekday = viewMonth.getDay()
  const totalDays = daysInMonth(viewMonth)
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstWeekday + 1
    if (dayNum < 1 || dayNum > totalDays) return null
    return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNum)
  })

  const hasRange = !!(from && to && !isSameDay(from, to))

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.row}>
        <Pressable onPress={toggle} style={[styles.field, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 10 }]}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('progress.rangeFrom')}</Text>
          <Text style={[styles.fieldValue, { color: theme.colors.textPrimary }]}>{from ? from.toLocaleDateString(i18n.language) : '–'}</Text>
        </Pressable>
        <Ionicons name={mirrorChevron('arrow-forward')} size={14} color={theme.colors.textTertiary} />
        <Pressable onPress={toggle} style={[styles.field, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 10 }]}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('progress.rangeTo')}</Text>
          <Text style={[styles.fieldValue, { color: theme.colors.textPrimary }]}>{to ? to.toLocaleDateString(i18n.language) : '–'}</Text>
        </Pressable>
        {(from || to) && (
          <Pressable onPress={clear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {expanded && (
        <View style={{ gap: 10 }}>
          <View style={styles.monthNavRow}>
            <Pressable
              disabled={!canGoPrev}
              onPress={() => { Haptics.selectionAsync(); setViewMonth((m) => addMonths(m, -1)) }}
              style={[styles.monthNavBtn, { opacity: canGoPrev ? 1 : 0.25 }]}
            >
              <Ionicons name={mirrorChevron('chevron-back')} size={17} color={theme.colors.textSecondary} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.colors.textPrimary }]}>
              {new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(viewMonth)}
            </Text>
            <Pressable
              disabled={!canGoNext}
              onPress={() => { Haptics.selectionAsync(); setViewMonth((m) => addMonths(m, 1)) }}
              style={[styles.monthNavBtn, { opacity: canGoNext ? 1 : 0.25 }]}
            >
              <Ionicons name={mirrorChevron('chevron-forward')} size={17} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View onLayout={handleGridLayout}>
          <View style={styles.weekRow}>
            {labels.map((label, i) => (
              <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
                <Text style={[styles.weekdayLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
              </View>
            ))}
          </View>

          {cellSize > 0 && (
          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (!d) return <View key={i} style={{ width: cellSize, height: cellSize }} />
              const disabled = (!!minDate && d < minDate && !isSameDay(d, minDate)) || (!!maxDate && d > maxDate && !isSameDay(d, maxDate))
              const isStart = !!from && isSameDay(d, from)
              const isEnd = !!to && isSameDay(d, to)
              const isInRange = hasRange && !!from && !!to && d.getTime() > from.getTime() && d.getTime() < to.getTime()
              const isEndpoint = isStart || isEnd
              return (
                <View key={i} style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
                  {hasRange && (isEndpoint || isInRange) && (
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          left: isStart ? '50%' : 0,
                          right: isEnd ? '50%' : 0,
                          backgroundColor: theme.colors.accentSoft,
                        },
                      ]}
                    />
                  )}
                  <Pressable
                    onPress={() => handleDayPress(d)}
                    disabled={disabled}
                    style={[
                      styles.dayCircle,
                      { width: cellSize - 8, height: cellSize - 8, borderRadius: (cellSize - 8) / 2 },
                      isEndpoint && { backgroundColor: theme.colors.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: disabled
                            ? theme.colors.textTertiary
                            : isEndpoint
                              ? theme.colors.onAccent
                              : theme.colors.textPrimary,
                          opacity: disabled ? 0.35 : 1,
                        },
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </Pressable>
                </View>
              )
            })}
          </View>
          )}
          </View>
        </View>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  fieldValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNavBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row' },
  weekdayLabel: { fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCircle: { alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontWeight: '600' },
})
