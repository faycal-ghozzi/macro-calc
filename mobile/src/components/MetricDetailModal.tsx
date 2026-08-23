import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ModalScreen } from './ModalScreen'
import { Card } from './Card'
import { MetricBarChart } from './MetricBarChart'
import { EmptyState } from './EmptyState'
import { useTheme } from '../theme/ThemeProvider'
import { bucketPoints, ChartPoint } from '../lib/chartUtils'

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

  const active = useMemo(() => points.filter((p) => p.value > 0), [points])
  const avg = active.length ? active.reduce((sum, p) => sum + p.value, 0) / active.length : 0
  const max = active.length ? Math.max(...active.map((p) => p.value)) : 0
  const min = active.length ? Math.min(...active.map((p) => p.value)) : 0
  const total = active.reduce((sum, p) => sum + p.value, 0)
  const chartData = useMemo(() => bucketPoints(points, MAX_CHART_POINTS), [points])
  const listRows = useMemo(() => [...active].reverse().slice(0, MAX_LIST_ROWS), [active])

  return (
    <ModalScreen visible={visible} title={title} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
