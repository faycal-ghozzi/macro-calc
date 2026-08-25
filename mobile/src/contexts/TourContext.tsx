import { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, interpolateColor, withTiming, withRepeat, Easing } from 'react-native-reanimated'
import { useProfile } from '../hooks/useProfile'
import { useTheme } from '../theme/ThemeProvider'

// Shared with TourOverlay's dimming-scrim cutout so the hole cut around a
// target and the glow ring drawn on the target always describe the exact
// same box - drift here reads as two misaligned outlines around one thing.
export const SPOTLIGHT_PADDING = 2
export const SPOTLIGHT_RADIUS_INSET = 6

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// Stable empty fallback for profile?.seen_feature_tips - an inline `{}`
// would be a fresh reference every render, tripping exhaustive-deps on the
// effects that key off it.
export const EMPTY_SEEN_TIPS: Record<string, boolean> = {}

export interface TourStepData {
  id: string
  title: string
  body: string
  // Tab route name to navigate to before this step is shown - lets a
  // sequence walk the user across screens (e.g. Log, Meals) rather than
  // only pointing at things visible from wherever the tour was started.
  navigateTo?: string
}

interface ActiveStep extends TourStepData {
  stepNumber: number
  totalSteps: number
  kind: 'sequence' | 'tip'
}

interface TourContextType {
  activeStep: ActiveStep | null
  getTargetRect: (id: string) => Rect | undefined
  registerTarget: (id: string, rect: Rect) => void
  unregisterTarget: (id: string) => void
  startSequence: (steps: TourStepData[]) => void
  showTip: (id: string, content: { title: string; body: string }) => void
  next: () => void
  skip: () => void
}

const TourContext = createContext<TourContextType>({
  activeStep: null,
  getTargetRect: () => undefined,
  registerTarget: () => {},
  unregisterTarget: () => {},
  startSequence: () => {},
  showTip: () => {},
  next: () => {},
  skip: () => {},
})

export function TourProvider({ children }: { children: ReactNode }) {
  const targetsRef = useRef<Record<string, Rect>>({})
  // Bumped on every (un)registration so consumers re-render and re-read the
  // ref - every step's position is resolved live from this map (never
  // frozen), which is what lets the overlay track a target that moves,
  // resizes, or only mounts after a cross-screen navigation.
  const [targetsVersion, setTargetsVersion] = useState(0)
  const [current, setCurrent] = useState<ActiveStep | null>(null)
  const [queue, setQueue] = useState<TourStepData[]>([])
  const { profile, updateProfile } = useProfile()
  const profileRef = useRef(profile)
  profileRef.current = profile

  // "Seen" state lives on the account's profile row (server-side, so it's
  // correctly scoped per account rather than per device - see
  // supabase/tour_progress.sql). A plain upsert replaces the jsonb column
  // wholesale, so seenFeatureTips writes read-modify-write off the latest
  // profile via this ref rather than a stale closure.
  const setHasSeenFirstLoginTour = useCallback((v: boolean) => {
    updateProfile({ has_seen_first_login_tour: v })
  }, [updateProfile])

  const markTipSeen = useCallback((id: string) => {
    updateProfile({ seen_feature_tips: { ...profileRef.current?.seen_feature_tips, [id]: true } })
  }, [updateProfile])

  const registerTarget = useCallback((id: string, rect: Rect) => {
    const prev = targetsRef.current[id]
    if (prev && prev.x === rect.x && prev.y === rect.y && prev.width === rect.width && prev.height === rect.height) return
    targetsRef.current[id] = rect
    setTargetsVersion((v) => v + 1)
  }, [])

  const unregisterTarget = useCallback((id: string) => {
    delete targetsRef.current[id]
  }, [])

  const getTargetRect = useCallback((id: string) => targetsRef.current[id], [])

  const startSequence = useCallback((steps: TourStepData[]) => {
    if (steps.length === 0) return
    setCurrent({ ...steps[0], stepNumber: 1, totalSteps: steps.length, kind: 'sequence' })
    setQueue(steps.slice(1))
  }, [])

  const showTip = useCallback((id: string, content: { title: string; body: string }) => {
    let cancelled = false
    const attempt = () => {
      if (cancelled) return true
      if (!targetsRef.current[id]) return false
      setCurrent((prevCurrent) => {
        // Already showing this exact tip - don't restart/reposition it.
        if (prevCurrent?.id === id && prevCurrent.kind === 'tip') return prevCurrent
        return { id, title: content.title, body: content.body, stepNumber: 1, totalSteps: 1, kind: 'tip' }
      })
      return true
    }
    if (!attempt()) {
      // A couple of retries covers slow-mounting screens (entrance
      // animations, async data) without retrying forever.
      const t1 = setTimeout(() => { if (!attempt()) setTimeout(attempt, 600) }, 350)
      return () => { cancelled = true; clearTimeout(t1) }
    }
  }, [])

  const next = useCallback(() => {
    if (!current) return
    if (current.kind === 'tip') {
      markTipSeen(current.id)
      setCurrent(null)
      return
    }
    // sequence
    if (queue.length === 0) {
      setHasSeenFirstLoginTour(true)
      setCurrent(null)
      return
    }
    const [nextStep, ...rest] = queue
    setCurrent({ ...nextStep, stepNumber: current.stepNumber + 1, totalSteps: current.totalSteps, kind: 'sequence' })
    setQueue(rest)
  }, [current, queue, markTipSeen, setHasSeenFirstLoginTour])

  const skip = useCallback(() => {
    setCurrent((prevCurrent) => {
      if (prevCurrent?.kind === 'tip') markTipSeen(prevCurrent.id)
      if (prevCurrent?.kind === 'sequence') setHasSeenFirstLoginTour(true)
      return null
    })
    setQueue([])
  }, [markTipSeen, setHasSeenFirstLoginTour])

  const value = useMemo(
    () => ({ activeStep: current, getTargetRect, registerTarget, unregisterTarget, startSequence, showTip, next, skip }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, targetsVersion, getTargetRect, registerTarget, unregisterTarget, startSequence, showTip, next, skip]
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export const useTour = () => useContext(TourContext)

const GLOW_CYCLE_MS = 12800

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Renders directly on top of the target itself (a sibling inside the same
// box, filled via inset positioning) instead of as a separately-measured
// overlay shape - so it's always pixel-perfect aligned with the real
// button's own shape, with no coordinate bookkeeping that can go stale or
// land slightly off-center. A soft animated border + tinted fill that
// cycles through the app's accent/macro colors, rather than a hard-edged
// spotlight ring.
export function TourGlow({ id }: { id: string }) {
  const theme = useTheme()
  const { activeStep } = useTour()
  const isActive = activeStep?.id === id
  const opacity = useSharedValue(0)
  const cycle = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(isActive ? 1 : 0, { duration: isActive ? 260 : 200, easing: Easing.out(Easing.cubic) })
  }, [isActive, opacity])

  useEffect(() => {
    cycle.value = withRepeat(withTiming(1, { duration: GLOW_CYCLE_MS, easing: Easing.linear }), -1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const borderColors = [theme.colors.accent, theme.colors.protein, theme.colors.carbs, theme.colors.fat, theme.colors.accent]
  const fillColors = borderColors.map((c) => hexToRgba(c, 0.16))
  const colorStops = [0, 0.25, 0.5, 0.75, 1]
  const borderRadius = theme.style.cardRadius - SPOTLIGHT_RADIUS_INSET

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    borderColor: interpolateColor(cycle.value, colorStops, borderColors),
    backgroundColor: interpolateColor(cycle.value, colorStops, fillColors),
  }))

  return <Animated.View pointerEvents="none" style={[styles.glow, { borderRadius }, animatedStyle]} />
}

// Wraps any element so it can be spotlighted by id during a tour - measures
// its on-screen position via measureInWindow and registers it (used to
// position the dimming scrim's cutout), and renders the glow itself as a
// same-box sibling rather than through that measurement.
export function TourTarget({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const { registerTarget, unregisterTarget } = useTour()
  const ref = useRef<View>(null)

  useEffect(() => () => unregisterTarget(id), [id, unregisterTarget])

  return (
    <View
      ref={ref}
      style={style}
      onLayout={() => {
        const measure = () => {
          ref.current?.measureInWindow((x, y, width, height) => {
            registerTarget(id, { x, y, width, height })
          })
        }
        // A tab screen mounting for the first time can lay out before safe-
        // area insets have been delivered, so the initial measurement can be
        // missing the status bar offset - re-measure shortly after to self-
        // correct (registerTarget no-ops if the rect turns out unchanged).
        requestAnimationFrame(measure)
        setTimeout(measure, 200)
        setTimeout(measure, 500)
      }}
    >
      {children}
      <TourGlow id={id} />
    </View>
  )
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -SPOTLIGHT_PADDING,
    left: -SPOTLIGHT_PADDING,
    right: -SPOTLIGHT_PADDING,
    bottom: -SPOTLIGHT_PADDING,
    borderWidth: 2.5,
  },
})
