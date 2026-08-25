import { generatePDF } from 'react-native-html-to-pdf'
import Share from 'react-native-share'
import { DayReport, ReportSummary } from '../hooks/useReports'
import { WeightEntry } from '../types'
import { isRtlLanguage } from '../i18n/languages'
import type { UnitSystem } from '../store/useUnitsStore'
import { formatMass, formatWeight, formatWeightDelta, weightUnitLabel, kgToDisplayValue, gToDisplayValue } from './units'
import { bucketPoints, ChartPoint } from './chartUtils'

type Translate = (key: string, opts?: Record<string, unknown>) => string

interface ReportColors {
  accent: string
  calories: string
  protein: string
  carbs: string
  fat: string
}

const CHART_MAX_POINTS = 40

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function statCell(value: string, label: string): string {
  return `<div class="stat-cell"><div class="stat-value">${escapeHtml(value)}</div><div class="stat-label">${escapeHtml(label)}</div></div>`
}

function chartLabels(points: ChartPoint[]): string {
  const first = points[0]?.date ?? ''
  const last = points[points.length - 1]?.date ?? ''
  return `<div class="chart-labels"><span>${escapeHtml(first)}</span><span>${escapeHtml(last)}</span></div>`
}

function svgGroupedBarChart(a: ChartPoint[], aColor: string, b: ChartPoint[], bColor: string, target?: number): string {
  const width = 680
  const height = 220
  const padding = 30
  const max = Math.max(target ?? 0, ...a.map((p) => p.value), ...b.map((p) => p.value), 1) * 1.1
  const n = Math.max(a.length, 1)
  const groupWidth = (width - padding * 2) / n
  const barWidth = Math.min(groupWidth * 0.32, 14)
  const bottom = height - padding

  const bars = a.map((p, i) => {
    const groupX = padding + i * groupWidth + groupWidth / 2
    const ah = (p.value / max) * (height - padding * 2)
    const bv = b[i]?.value ?? 0
    const bh = (bv / max) * (height - padding * 2)
    const ax = groupX - barWidth - 1
    const bx = groupX + 1
    let s = `<rect x="${ax.toFixed(1)}" y="${(bottom - ah).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${ah.toFixed(1)}" rx="2" fill="${aColor}" />`
    if (bv > 0) s += `<rect x="${bx.toFixed(1)}" y="${(bottom - bh).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${bColor}" />`
    return s
  }).join('')

  const targetLine = target
    ? (() => {
        const y = bottom - (target / max) * (height - padding * 2)
        return `<line x1="${padding}" y1="${y.toFixed(1)}" x2="${width - padding}" y2="${y.toFixed(1)}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6" />`
      })()
    : ''

  return `
    <svg width="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${targetLine}
      ${bars}
      <line x1="${padding}" y1="${bottom}" x2="${width - padding}" y2="${bottom}" stroke="#cbd5e1" stroke-width="1" />
    </svg>
    ${chartLabels(a)}
  `
}

function svgLineChart(series: { label: string; color: string; points: ChartPoint[] }[]): string {
  const width = 680
  const height = 220
  const padding = 30
  const allValues = series.flatMap((s) => s.points.map((p) => p.value))
  const max = Math.max(...allValues, 1) * 1.1
  const n = Math.max(series[0]?.points.length ?? 1, 1)

  const lines = series.map((s) => {
    const pts = s.points.map((p, i) => {
      const x = padding + (n > 1 ? (i / (n - 1)) * (width - padding * 2) : 0)
      const y = height - padding - (p.value / max) * (height - padding * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`
  }).join('')

  const legend = series.length > 1
    ? `<div class="legend-row">${series.map((s) => `<span class="legend-item"><span class="dot" style="background:${s.color}"></span>${escapeHtml(s.label)}</span>`).join('')}</div>`
    : ''

  return `
    ${legend}
    <svg width="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="1" />
      ${lines}
    </svg>
    ${chartLabels(series[0]?.points ?? [])}
  `
}

function htmlDocument(footer: string, dir: 'ltr' | 'rtl', body: string): string {
  const align = dir === 'rtl' ? 'right' : 'left'
  return `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 32px; color: #12151A; background: #ffffff; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #5B6470; margin-bottom: 6px; }
  .note { font-size: 11px; color: #9BA3AE; margin-bottom: 20px; }
  .section-title { font-size: 15px; font-weight: 700; margin: 26px 0 10px; }
  .stats-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .stat-cell { flex: 1 1 21%; border: 1px solid #E6E8EC; border-radius: 12px; padding: 12px; text-align: ${align}; }
  .stat-value { font-size: 17px; font-weight: 700; }
  .stat-label { font-size: 10px; color: #5B6470; margin-top: 2px; }
  .chart-labels { display: flex; justify-content: space-between; font-size: 10px; color: #5B6470; margin-top: 2px; }
  .legend-row { display: flex; gap: 14px; margin-bottom: 6px; font-size: 11px; color: #5B6470; }
  .legend-item { display: inline-flex; align-items: center; gap: 5px; }
  .dot { width: 7px; height: 7px; border-radius: 4px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #EEF0F3; text-align: ${align}; }
  th { color: #5B6470; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.02em; }
  .footer { margin-top: 24px; font-size: 10px; color: #9BA3AE; text-align: center; }
</style>
</head>
<body>
${body}
<div class="footer">${escapeHtml(footer)}</div>
</body>
</html>`
}

async function exportHtmlAsPdf(html: string, fileName: string): Promise<void> {
  const { filePath } = await generatePDF({ html, fileName, base64: false })
  const url = filePath.startsWith('file://') ? filePath : `file://${filePath}`
  await Share.open({ url, type: 'application/pdf', filename: fileName, failOnCancel: false })
}

export async function exportNutritionReport(opts: {
  t: Translate
  language: string
  system: UnitSystem
  rangeLabel: string
  report: ReportSummary
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null
  colors: ReportColors
}): Promise<void> {
  const { t, language, system, rangeLabel, report, targets, colors } = opts
  const dir: 'ltr' | 'rtl' = isRtlLanguage(language) ? 'rtl' : 'ltr'
  const kcal = t('common.kcal')

  const toPoints = (key: keyof DayReport): ChartPoint[] => report.days.map((d) => ({ date: d.date, value: d[key] as number }))
  const calSeries = bucketPoints(toPoints('calories'), CHART_MAX_POINTS)
  const burnedSeries = bucketPoints(toPoints('calories_burned'), CHART_MAX_POINTS)
  const proteinSeries = bucketPoints(report.days.map((d) => ({ date: d.date, value: gToDisplayValue(d.protein_g, system) })), CHART_MAX_POINTS)
  const carbsSeries = bucketPoints(report.days.map((d) => ({ date: d.date, value: gToDisplayValue(d.carbs_g, system) })), CHART_MAX_POINTS)
  const fatSeries = bucketPoints(report.days.map((d) => ({ date: d.date, value: gToDisplayValue(d.fat_g, system) })), CHART_MAX_POINTS)

  const statsGrid = `<div class="stats-grid">
    ${statCell(`${report.avg_calories} ${kcal}`, t('progress.avgDailyCalories'))}
    ${statCell(`${report.avg_net_calories} ${kcal}`, t('progress.avgNetCalories'))}
    ${statCell(`${report.total_burned} ${kcal}`, t('progress.totalBurned'))}
    ${statCell(formatMass(report.avg_protein, system), t('progress.avgProtein'))}
    ${statCell(formatMass(report.avg_carbs, system), t('macros.carbs'))}
    ${statCell(formatMass(report.avg_fat, system), t('macros.fat'))}
  </div>`

  const tableRows = report.days
    .filter((d) => d.calories > 0)
    .map((d) => `<tr>
      <td>${escapeHtml(d.date)}</td>
      <td>${Math.round(d.calories)}</td>
      <td>${formatMass(d.protein_g, system)}</td>
      <td>${formatMass(d.carbs_g, system)}</td>
      <td>${formatMass(d.fat_g, system)}</td>
      <td>${Math.round(d.calories_burned)}</td>
      <td>${Math.round(d.net_calories)}</td>
    </tr>`).join('')

  const body = `
    <h1>${escapeHtml(t('progress.reportTitle'))}</h1>
    <div class="meta">${escapeHtml(rangeLabel)}</div>
    <div class="note">${escapeHtml(t('progress.reportGeneratedOn', { date: new Date().toISOString().split('T')[0] }))} · ${escapeHtml(t('progress.activeDays', { count: report.active_days }))}</div>
    ${statsGrid}
    <div class="section-title">${escapeHtml(t('progress.dailyCalories'))}</div>
    <div class="legend-row">
      <span class="legend-item"><span class="dot" style="background:${colors.accent}"></span>${escapeHtml(t('progress.consumed'))}</span>
      <span class="legend-item"><span class="dot" style="background:${colors.calories}"></span>${escapeHtml(t('progress.burned'))}</span>
    </div>
    ${svgGroupedBarChart(calSeries, colors.accent, burnedSeries, colors.calories, targets?.calories)}
    <div class="section-title">${escapeHtml(t('progress.avgMacrosPerDay'))}</div>
    ${svgLineChart([
      { label: t('macros.protein'), color: colors.protein, points: proteinSeries },
      { label: t('macros.carbs'), color: colors.carbs, points: carbsSeries },
      { label: t('macros.fat'), color: colors.fat, points: fatSeries },
    ])}
    <div class="section-title">${escapeHtml(t('progress.dayByDay'))}</div>
    <table>
      <thead><tr>
        <th>${escapeHtml(t('progress.colDate'))}</th>
        <th>${escapeHtml(t('progress.colCalories'))}</th>
        <th>${escapeHtml(t('macros.protein'))}</th>
        <th>${escapeHtml(t('macros.carbs'))}</th>
        <th>${escapeHtml(t('macros.fat'))}</th>
        <th>${escapeHtml(t('progress.colBurned'))}</th>
        <th>${escapeHtml(t('progress.colNet'))}</th>
      </tr></thead>
      <tbody>${tableRows || `<tr><td colspan="7">${escapeHtml(t('progress.detailEmpty'))}</td></tr>`}</tbody>
    </table>
  `

  await exportHtmlAsPdf(htmlDocument('FLOW', dir, body), `flow-progress-${new Date().toISOString().split('T')[0]}`)
}

export async function exportWeightReport(opts: {
  t: Translate
  language: string
  system: UnitSystem
  entries: WeightEntry[]
  accentColor: string
}): Promise<void> {
  const { t, language, system, entries, accentColor } = opts
  const dir: 'ltr' | 'rtl' = isRtlLanguage(language) ? 'rtl' : 'ltr'
  const weightUnit = weightUnitLabel(system)

  const points = bucketPoints(entries.map((e) => ({ date: e.logged_at, value: kgToDisplayValue(e.weight_kg, system) })), CHART_MAX_POINTS)
  const latest = entries[entries.length - 1]
  const first = entries[0]
  const totalChangeDisplay = latest && first ? kgToDisplayValue(latest.weight_kg - first.weight_kg, system) : 0

  const statsGrid = `<div class="stats-grid">
    ${statCell(latest ? formatWeight(latest.weight_kg, system) : '—', t('progress.statCurrent', { unit: weightUnit }))}
    ${statCell(`${totalChangeDisplay >= 0 ? '+' : ''}${totalChangeDisplay.toFixed(1)} ${weightUnit}`, t('progress.statTotalDelta'))}
    ${statCell(String(entries.length), t('progress.statEntries'))}
  </div>`

  const reversed = [...entries].reverse()
  const tableRows = reversed.map((e, i) => {
    const prev = reversed[i + 1]
    const diff = prev ? e.weight_kg - prev.weight_kg : null
    return `<tr>
      <td>${escapeHtml(e.logged_at)}</td>
      <td>${formatWeight(e.weight_kg, system)}</td>
      <td>${diff !== null ? escapeHtml(formatWeightDelta(diff, system)) : '—'}</td>
      <td>${e.notes ? escapeHtml(e.notes) : ''}</td>
    </tr>`
  }).join('')

  const body = `
    <h1>${escapeHtml(t('progress.reportTitle'))}</h1>
    <div class="meta">${escapeHtml(t('progress.tabWeight'))}</div>
    <div class="note">${escapeHtml(t('progress.reportGeneratedOn', { date: new Date().toISOString().split('T')[0] }))}</div>
    ${statsGrid}
    <div class="section-title">${escapeHtml(t('progress.weightHistory'))}</div>
    ${entries.length >= 2 ? svgLineChart([{ label: weightUnit, color: accentColor, points }]) : ''}
    <table>
      <thead><tr>
        <th>${escapeHtml(t('progress.colDate'))}</th>
        <th>${escapeHtml(t('progress.colWeight'))}</th>
        <th>${escapeHtml(t('progress.colChange'))}</th>
        <th>${escapeHtml(t('progress.colNotes'))}</th>
      </tr></thead>
      <tbody>${tableRows || `<tr><td colspan="4">${escapeHtml(t('progress.emptyTitle'))}</td></tr>`}</tbody>
    </table>
  `

  await exportHtmlAsPdf(htmlDocument('FLOW', dir, body), `flow-weight-${new Date().toISOString().split('T')[0]}`)
}
