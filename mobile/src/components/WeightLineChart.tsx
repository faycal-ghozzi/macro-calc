import { View, Text } from 'react-native'
import Svg, { Polyline, Circle, Line as SvgLine } from 'react-native-svg'
import { useTheme } from '../theme/ThemeProvider'

interface Point {
  date: string
  weight: number
}

export function WeightLineChart({ data, height = 160 }: { data: Point[]; height?: number }) {
  const theme = useTheme()
  const width = 320
  const padding = 24
  const values = data.map((d) => d.weight)
  const min = Math.min(...values) - 1
  const max = Math.max(...values) + 1
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - ((d.weight - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const gridLines = 3

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {Array.from({ length: gridLines }).map((_, i) => {
          const y = padding + (i / (gridLines - 1)) * (height - padding * 2)
          return (
            <SvgLine key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke={theme.colors.divider} strokeWidth={1} strokeDasharray="4 4" />
          )
        })}
        <Polyline points={polylinePoints} fill="none" stroke={theme.colors.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={theme.colors.accent} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{data[0]?.date}</Text>
        <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{data[data.length - 1]?.date}</Text>
      </View>
    </View>
  )
}
