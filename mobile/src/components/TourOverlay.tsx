import { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Svg, { Path } from 'react-native-svg'
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useTour } from '../contexts/TourContext'
import type { TabParamList } from '../navigation/TabNavigator'

const SPOTLIGHT_PADDING = 8
const TOOLTIP_GAP = 16
const MOVE_DURATION = 320

const AnimatedPath = Animated.createAnimatedComponent(Path)

// Traces a rounded rect as its own closed subpath - combined with the full-
// screen rect via evenodd fill rule, this cuts a rounded (not square-cornered)
// hole out of the dim overlay.
function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  'worklet'
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  return `M${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x + rr} A${rr},${rr} 0 0 1 ${x},${y + h - rr} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`
}

export function TourOverlay() {
  const theme = useTheme()
  const { activeStep, next, skip, getTargetRect } = useTour()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const spotlightRadius = theme.style.cardRadius - 6
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>()
  const lastNavigatedTo = useRef<string | null>(null)

  // A step can require being on a specific tab (e.g. highlighting the Share
  // button only makes sense on the Log screen) - navigate there as the step
  // becomes active, once per step.
  useEffect(() => {
    const target = activeStep?.navigateTo
    if (!target || lastNavigatedTo.current === target) return
    lastNavigatedTo.current = target
    navigation.navigate(target as keyof TabParamList)
  }, [activeStep?.navigateTo, navigation])

  // Every step's position is resolved live from the target registry - never
  // frozen - so it tracks a target that moves, resizes, or only mounts after
  // the navigation above finishes.
  const liveRect = activeStep ? getTargetRect(activeStep.id) : null

  const boxX = useSharedValue(0)
  const boxY = useSharedValue(0)
  const boxW = useSharedValue(0)
  const boxH = useSharedValue(0)
  const hasPositioned = useRef(false)
  const tooltipAnim = useSharedValue(0)
  const pulse = useSharedValue(0)

  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1, true)
  }, [pulse])

  // The overlay stays mounted (just renders null) between tours, so its
  // shared values persist - without this, a fresh tour would animate in
  // from wherever the box was left at the end of the previous one.
  useEffect(() => {
    if (!activeStep) hasPositioned.current = false
  }, [activeStep])

  useEffect(() => {
    if (!liveRect) return
    const x = Math.max(0, liveRect.x - SPOTLIGHT_PADDING)
    const y = Math.max(0, liveRect.y - SPOTLIGHT_PADDING)
    const w = liveRect.width + SPOTLIGHT_PADDING * 2
    const h = liveRect.height + SPOTLIGHT_PADDING * 2

    if (!hasPositioned.current) {
      // Snap on first appearance for this mount - animating in from (0,0)
      // would flash a shrunken box in the corner before growing.
      boxX.value = x
      boxY.value = y
      boxW.value = w
      boxH.value = h
      hasPositioned.current = true
    } else {
      boxX.value = withTiming(x, { duration: MOVE_DURATION, easing: Easing.out(Easing.cubic) })
      boxY.value = withTiming(y, { duration: MOVE_DURATION, easing: Easing.out(Easing.cubic) })
      boxW.value = withTiming(w, { duration: MOVE_DURATION, easing: Easing.out(Easing.cubic) })
      boxH.value = withTiming(h, { duration: MOVE_DURATION, easing: Easing.out(Easing.cubic) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRect?.x, liveRect?.y, liveRect?.width, liveRect?.height])

  useEffect(() => {
    tooltipAnim.value = 0
    tooltipAnim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep?.id])

  const maskProps = useAnimatedProps(() => {
    const hole = roundedRectPath(boxX.value, boxY.value, boxW.value, boxH.value, spotlightRadius)
    return { d: `M0,0H${screenWidth}V${screenHeight}H0Z ${hole}` }
  })
  const spotlightStyle = useAnimatedStyle(() => ({
    top: boxY.value,
    left: boxX.value,
    width: boxW.value,
    height: boxH.value,
    opacity: 0.7 + pulse.value * 0.3,
  }))
  const tooltipAnimStyle = useAnimatedStyle(() => ({
    opacity: tooltipAnim.value,
    transform: [{ scale: 0.95 + tooltipAnim.value * 0.05 }, { translateY: (1 - tooltipAnim.value) * 10 }],
  }))

  if (!activeStep || !liveRect) return null
  const { title, body, stepNumber, totalSteps, kind } = activeStep

  const holeTop = Math.max(0, liveRect.y - SPOTLIGHT_PADDING)
  const holeBottom = Math.min(screenHeight, liveRect.y + liveRect.height + SPOTLIGHT_PADDING)

  const placeBelow = holeTop > screenHeight * 0.55
  const tooltipTop = placeBelow ? undefined : Math.min(holeBottom + TOOLTIP_GAP, screenHeight - insets.bottom - 160)
  const tooltipBottom = placeBelow ? screenHeight - holeTop + TOOLTIP_GAP : undefined

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={skip}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Dimmed scrim with a rounded hole cut out via evenodd fill - matches
            the spotlight border's radius instead of leaving square corners. */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <AnimatedPath animatedProps={maskProps} fill={theme.colors.overlay} fillRule="evenodd" />
        </Svg>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.spotlightBorder,
            spotlightStyle,
            { borderColor: theme.colors.accent, borderRadius: spotlightRadius },
          ]}
        />

        <Animated.View
          style={[
            styles.tooltip,
            tooltipAnimStyle,
            {
              top: tooltipTop,
              bottom: tooltipBottom,
              left: 20,
              right: 20,
              backgroundColor: theme.colors.card,
              borderRadius: theme.style.cardRadius,
              borderColor: theme.colors.cardBorder,
              borderWidth: theme.style.cardBorderWidth,
            },
          ]}
        >
          {totalSteps > 1 && (
            <Text style={[styles.stepCount, { color: theme.colors.textTertiary }]}>{stepNumber} / {totalSteps}</Text>
          )}
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{body}</Text>

          <View style={styles.actions}>
            {kind === 'sequence' && stepNumber < totalSteps && (
              <Pressable onPress={() => { Haptics.selectionAsync(); skip() }} style={styles.skipButton}>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 13, fontWeight: '600' }}>Skip</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); next() }}
              style={[styles.nextButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8 }]}
            >
              <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>
                {kind === 'tip' || stepNumber === totalSteps ? 'Got it' : 'Next'}
              </Text>
              {kind === 'sequence' && stepNumber < totalSteps && (
                <Ionicons name="chevron-forward" size={16} color={theme.colors.onAccent} />
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  spotlightBorder: { position: 'absolute', borderWidth: 2 },
  tooltip: { position: 'absolute', padding: 18 },
  stepCount: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 16 },
  skipButton: { paddingVertical: 8, paddingHorizontal: 4 },
  nextButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18, paddingVertical: 10 },
})
