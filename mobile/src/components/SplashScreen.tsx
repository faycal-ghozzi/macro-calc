import { useEffect } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme/ThemeProvider'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const RING_WRAP_SIZE = 132

interface RingConfig {
  size: number
  strokeWidth: number
  colorKey: 'protein' | 'carbs' | 'fat'
  target: number
  delay: number
}

const RINGS: RingConfig[] = [
  { size: 132, strokeWidth: 11, colorKey: 'protein', target: 0.82, delay: 0 },
  { size: 98, strokeWidth: 10, colorKey: 'carbs', target: 0.66, delay: 130 },
  { size: 64, strokeWidth: 9, colorKey: 'fat', target: 0.52, delay: 260 },
]

function SplashRing({ size, strokeWidth, color, target, delay }: { size: number; strokeWidth: number; color: string; target: number; delay: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(target, { duration: 850, easing: Easing.out(Easing.cubic) }),
        withRepeat(withTiming(target - 0.07, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true)
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }))

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeOpacity={0.14} strokeWidth={strokeWidth} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        fill="none"
        rotation={-90}
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  )
}

export function SplashScreen({ onPress }: { onPress?: () => void }) {
  const theme = useTheme()
  const { t } = useTranslation()
  const wordmarkOpacity = useSharedValue(0)
  const wordmarkY = useSharedValue(10)
  const breathe = useSharedValue(1)

  useEffect(() => {
    wordmarkOpacity.value = withDelay(600, withTiming(1, { duration: 500 }))
    wordmarkY.value = withDelay(600, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }))
    breathe.value = withDelay(
      850,
      withRepeat(
        withSequence(
          withTiming(1.035, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }))
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }))

  const ringColors: Record<RingConfig['colorKey'], string> = {
    protein: theme.colors.protein,
    carbs: theme.colors.carbs,
    fat: theme.colors.fat,
  }

  return (
    <Pressable style={[styles.root, { backgroundColor: theme.colors.background }]} onPress={onPress} disabled={!onPress}>
      <Animated.View style={[styles.ringWrap, breatheStyle]}>
        {RINGS.map((ring) => (
          <View
            key={ring.colorKey}
            style={{ position: 'absolute', top: (RING_WRAP_SIZE - ring.size) / 2, left: (RING_WRAP_SIZE - ring.size) / 2 }}
          >
            <SplashRing size={ring.size} strokeWidth={ring.strokeWidth} color={ringColors[ring.colorKey]} target={ring.target} delay={ring.delay} />
          </View>
        ))}
      </Animated.View>
      <Animated.Text style={[styles.wordmark, { color: theme.colors.textPrimary }, wordmarkStyle]}>
        {t('auth.appName')}
      </Animated.Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: RING_WRAP_SIZE, height: RING_WRAP_SIZE, alignItems: 'center', justifyContent: 'center' },
  wordmark: { marginTop: 28, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
})
