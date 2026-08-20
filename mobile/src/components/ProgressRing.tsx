import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '../theme/ThemeProvider'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface ProgressRingProps {
  size: number
  progress: number // 0..1+ (can exceed 1, gets clamped for the ring but caller may show overage separately)
  color: string
  trackOpacity?: number
  thickness?: number
  children?: React.ReactNode
}

export function ProgressRing({ size, progress, color, trackOpacity, thickness, children }: ProgressRingProps) {
  const theme = useTheme()
  const strokeWidth = thickness ?? theme.style.ringThickness
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = useSharedValue(0)

  useEffect(() => {
    clamped.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    })
  }, [progress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - clamped.value),
  }))

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeOpacity={trackOpacity ?? theme.style.ringTrackOpacity}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap={theme.style.ringCap}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      {children}
    </View>
  )
}

export function RingLabel({ value, label }: { value: string; label: string }) {
  const theme = useTheme()
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.textPrimary, letterSpacing: -0.5 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  )
}
