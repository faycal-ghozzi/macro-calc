import { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { View, ViewStyle } from 'react-native'
import { useTourProgressStore } from '../store/useTourProgressStore'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

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
  const setHasSeenFirstLoginTour = useTourProgressStore((s) => s.setHasSeenFirstLoginTour)
  const markTipSeen = useTourProgressStore((s) => s.markTipSeen)

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

// Wraps any element so it can be spotlighted by id during a tour - measures
// its on-screen position via measureInWindow and registers it, rather than
// requiring every screen to manage refs/measurement itself. This is also
// what makes the tour work correctly on any device/screen size: positions
// are always the real rendered bounds, never a computed guess.
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
    </View>
  )
}
