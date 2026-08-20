import { View, Text } from 'react-native'
import Svg, { Rect, Line as SvgLine, G } from 'react-native-svg'
import { useTheme } from '../theme/ThemeProvider'

interface Day {
  date: string
  consumed: number
  burned: number
}

export function CalorieBarChart({ data, target, height = 150 }: { data: Day[]; target?: number; height?: number }) {
  const theme = useTheme()
  const width = 320
  const padding = 10
  const max = Math.max(target ?? 0, ...data.map((d) => Math.max(d.consumed, d.burned)), 100) * 1.1
  const groupWidth = (width - padding * 2) / data.length
  const barWidth = Math.min(groupWidth * 0.32, 10)

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {target ? (
          <SvgLine
            x1={padding} x2={width - padding}
            y1={height - padding - (target / max) * (height - padding * 2)}
            y2={height - padding - (target / max) * (height - padding * 2)}
            stroke={theme.colors.textTertiary} strokeWidth={1} strokeDasharray="4 4"
          />
        ) : null}
        {data.map((d, i) => {
          const groupX = padding + i * groupWidth + groupWidth / 2
          const consumedH = (d.consumed / max) * (height - padding * 2)
          const burnedH = (d.burned / max) * (height - padding * 2)
          return (
            <G key={d.date}>
              <Rect
                x={groupX - barWidth - 1}
                y={height - padding - consumedH}
                width={barWidth}
                height={consumedH}
                rx={2}
                fill={theme.colors.accent}
              />
              {d.burned > 0 && (
                <Rect
                  x={groupX + 1}
                  y={height - padding - burnedH}
                  width={barWidth}
                  height={burnedH}
                  rx={2}
                  fill={theme.colors.calories}
                />
              )}
            </G>
          )
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{data[0]?.date}</Text>
        <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{data[data.length - 1]?.date}</Text>
      </View>
    </View>
  )
}
