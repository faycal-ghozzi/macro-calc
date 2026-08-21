import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface TourProgressState {
  hasSeenFirstLoginTour: boolean
  setHasSeenFirstLoginTour: (v: boolean) => void
  seenFeatureTips: Record<string, boolean>
  markTipSeen: (id: string) => void
}

export const useTourProgressStore = create<TourProgressState>()(
  persist(
    (set) => ({
      hasSeenFirstLoginTour: false,
      setHasSeenFirstLoginTour: (v) => set({ hasSeenFirstLoginTour: v }),
      seenFeatureTips: {},
      markTipSeen: (id) => set((s) => ({ seenFeatureTips: { ...s.seenFeatureTips, [id]: true } })),
    }),
    {
      name: 'macrotrack-tour-progress',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
