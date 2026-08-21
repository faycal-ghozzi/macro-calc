import { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { View } from 'react-native'
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
  rect: Rect
}

interface ActiveStep extends TourStepData {
  stepNumber: number
  totalSteps: number
  kind: 'sequence' | 'tip'
}

interface TourContextType {
  activeStep: ActiveStep | null
  registerTarget: (id: string, rect: Rect) => void
  unregisterTarget: (id: string) => void
  startFirstLoginTour: (steps: TourStepData[]) => void
  showTip: (id: string, content: { title: string; body: string }) => void
  next: () => void
  skip: () => void
}

const TourContext = createContext<TourContextType>({
  activeStep: null,
  registerTarget: () => {},
  unregisterTarget: () => {},
  startFirstLoginTour: () => {},
  showTip: () => {},
  next: () => {},
  skip: () => {},
})

export function TourProvider({ children }: { children: ReactNode }) {
  const targetsRef = useRef<Record<string, Rect>>({})
  const [current, setCurrent] = useState<ActiveStep | null>(null)
  const [queue, setQueue] = useState<TourStepData[]>([])
  const setHasSeenFirstLoginTour = useTourProgressStore((s) => s.setHasSeenFirstLoginTour)
  const markTipSeen = useTourProgressStore((s) => s.markTipSeen)

  const registerTarget = useCallback((id: string, rect: Rect) => {
    targetsRef.current[id] = rect
  }, [])

  const unregisterTarget = useCallback((id: string) => {
    delete targetsRef.current[id]
  }, [])

  const startFirstLoginTour = useCallback((steps: TourStepData[]) => {
    if (steps.length === 0) return
    setCurrent({ ...steps[0], stepNumber: 1, totalSteps: steps.length, kind: 'sequence' })
    setQueue(steps.slice(1))
  }, [])

  const showTip = useCallback((id: string, content: { title: string; body: string }) => {
    const attempt = () => {
      const rect = targetsRef.current[id]
      if (!rect) return false
      setCurrent({ id, title: content.title, body: content.body, rect, stepNumber: 1, totalSteps: 1, kind: 'tip' })
      return true
    }
    if (!attempt()) setTimeout(attempt, 350)
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
    () => ({ activeStep: current, registerTarget, unregisterTarget, startFirstLoginTour, showTip, next, skip }),
    [current, registerTarget, unregisterTarget, startFirstLoginTour, showTip, next, skip]
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export const useTour = () => useContext(TourContext)

// Wraps any element so it can be spotlighted by id during a tour - measures
// its on-screen position via measureInWindow and registers it, rather than
// requiring every screen to manage refs/measurement itself.
export function TourTarget({ id, children }: { id: string; children: ReactNode }) {
  const { registerTarget, unregisterTarget } = useTour()
  const ref = useRef<View>(null)

  useEffect(() => () => unregisterTarget(id), [id, unregisterTarget])

  return (
    <View
      ref={ref}
      onLayout={() => {
        requestAnimationFrame(() => {
          ref.current?.measureInWindow((x, y, width, height) => {
            registerTarget(id, { x, y, width, height })
          })
        })
      }}
    >
      {children}
    </View>
  )
}
