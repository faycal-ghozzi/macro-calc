import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ModalScreen } from './ModalScreen'
import { Card } from './Card'
import { MetricBarChart } from './MetricBarChart'
import { EmptyState } from './EmptyState'
import { DateRangePicker } from './DateRangePicker'
import { useTheme } from '../theme/ThemeProvider'
import { bucketPoints, dateKey, ChartPoint } from '../lib/chartUtils'

interface MetricDetailModalProps {
  visible: boolean
  onClose: () => void
  title: string
  color: string
  points: ChartPoint[]
  formatValue: (n: number) => string
  targetValue?: number
}

const MAX_LIST_ROWS = 200
const MAX_CHART_POINTS = 45

export function MetricDetailModal({ visible, onClose, title, color, points, formatValue, targetValue }: MetricDetailModalProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [rangeFrom, setRangeFrom] = useState<Date | null>(null)
  const [rangeTo, setRangeTo] = useState<Date | null>(null)

  // A fresh look at a (possibly different) metric each time this opens -
  // any range picked while viewing the last one shouldn't carry over.
  useEffect(() => {
    if (visible) { setRangeFrom(null); setRangeTo(null) }
  }, [visible])

  const dataMinDate = points[0]?.date ? new Date(points[0].date) : undefined
  const dataMaxDate = points[points.length - 1]?.date ? new Date(points[points.length - 1].date) : undefined

  const filteredPoints = useMemo(() => {
    if (!rangeFrom && !rangeTo) return points
    const start = rangeFrom ? dateKey(rangeFrom) : (points[0]?.date ?? '')
    const end = rangeTo ? dateKey(rangeTo) : (points[points.length - 1]?.date ?? '')
    return points.filter((p) => p.date >= start && p.date <= end)
  }, [points, rangeFrom, rangeTo])

  const active = useMemo(() => filteredPoints.filter((p) => p.value > 0), [filteredPoints])
  const avg = active.length ? active.reduce((sum, p) => sum + p.value, 0) / active.length : 0
  const max = active.length ? Math.max(...active.map((p) => p.value)) : 0
  const min = active.length ? Math.min(...active.map((p) => p.value)) : 0
  const total = active.reduce((sum, p) => sum + p.value, 0)
  const chartData = useMemo(() => bucketPoints(filteredPoints, MAX_CHART_POINTS), [filteredPoints])
  const listRows = useMemo(() => [...active].reverse().slice(0, MAX_LIST_ROWS), [active])

  return (
    <ModalScreen visible={visible} title={title} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DateRangePicker from={rangeFrom} to={rangeTo} onChangeFrom={setRangeFrom} onChangeTo={setRangeTo} minDate={dataMinDate} maxDate={dataMaxDate} />

        {active.length === 0 ? (
          <EmptyState icon="bar-chart-outline" title={t('progress.detailEmpty')} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatValue(avg)}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{t('progress.detailAvg')}</Text>
              </Card>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatValue(max)}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{t('progress.detailMax')}</Text>
              </Card>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatValue(min)}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{t('progress.detailMin')}</Text>
              </Card>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatValue(total)}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{t('progress.detailTotal')}</Text>
              </Card>
            </View>

            <Card>
              <MetricBarChart data={chartData} color={color} target={targetValue} />
            </Card>

            <View style={{ gap: 8 }}>
              {listRows.map((p) => (
                <Card key={p.date} style={styles.dayRow}>
                  <Text style={[styles.dayDate, { color: theme.colors.textPrimary }]}>{p.date}</Text>
                  <Text style={[styles.dayValue, { color }]}>{formatValue(p.value)}</Text>
                </Card>
              ))}
              {active.length > MAX_LIST_ROWS && (
                <Text style={[styles.moreNote, { color: theme.colors.textTertiary }]}>
                  {t('progress.detailMoreInExport', { count: active.length - MAX_LIST_ROWS })}
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ModalScreen>
  )
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statCell: { flexBasis: '23%', flexGrow: 1, alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDate: { fontSize: 13, fontWeight: '600' },
  dayValue: { fontSize: 13, fontWeight: '700' },
  moreNote: { fontSize: 11, textAlign: 'center', marginTop: 4 },
})
