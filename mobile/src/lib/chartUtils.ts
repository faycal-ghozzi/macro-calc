export interface ChartPoint {
  date: string
  value: number
}

// Matches the 'YYYY-MM-DD' keys DayReport.date/food_logs.logged_at use
// throughout the app, so a picked Date can be compared/filtered directly.
export function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

// Downsamples a long time series into at most maxPoints buckets by averaging
// active (non-zero) values, so a multi-year "all time" range stays readable
// as a chart instead of rendering thousands of hairline bars.
export function bucketPoints(points: ChartPoint[], maxPoints: number): ChartPoint[] {
  if (points.length <= maxPoints) return points
  const bucketSize = Math.ceil(points.length / maxPoints)
  const buckets: ChartPoint[] = []
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize)
    const active = slice.filter((p) => p.value > 0)
    const avg = active.length ? active.reduce((sum, p) => sum + p.value, 0) / active.length : 0
    buckets.push({ date: slice[0].date, value: avg })
  }
  return buckets
}
