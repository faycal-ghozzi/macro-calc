import { useEffect } from 'react'
import { View } from 'react-native'
import Svg, { Rect, Line as SvgLine, G } from 'react-native-svg'
import Animated, { useAnimatedProps, useSharedValue, withTiming, withDelay, Easing } from 'react-native-reanimated'
import { useTheme } from '../theme/ThemeProvider'
import { ChartPoint } from '../lib/chartUtils'

const AnimatedRect = Animated.createAnimatedComponent(Rect)

function AnimatedBar({ x, bottom, targetHeight, width, fill, delay }: {
  x: number
  bottom: number
  targetHeight: number
  width: number
  fill: string
  delay: number
}) {
  const h = useSharedValue(0)

  useEffect(() => {
    h.value = withDelay(delay, withTiming(targetHeight, { duration: 500, easing: Easing.out(Easing.cubic) }))
  }, [targetHeight, delay, h])

  const animatedProps = useAnimatedProps(() => ({
    height: h.value,
    y: bottom - h.value,
  }))

  return <AnimatedRect x={x} width={width} rx={2} fill={fill} animatedProps={animatedProps} />
}

export function MetricBarChart({ data, color, target, height = 160 }: { data: ChartPoint[]; color: string; target?: number; height?: number }) {
  const theme = useTheme()
  const width = 320
  const padding = 10
  const max = Math.max(target ?? 0, ...data.map((d) => d.value), 1) * 1.1
  const groupWidth = (width - padding * 2) / Math.max(data.length, 1)
  const barWidth = Math.min(groupWidth * 0.5, 14)
  const bottom = height - padding

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
          const h = (d.value / max) * (height - padding * 2)
          return (
            <G key={`${d.date}-${i}`}>
              <AnimatedBar x={groupX - barWidth / 2} bottom={bottom} targetHeight={h} width={barWidth} fill={color} delay={i * 20} />
            </G>
          )
        })}
      </Svg>
    </View>
  )
}
