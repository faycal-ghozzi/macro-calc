import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface DowngradeUiState {
  decidedSummaryShown: boolean
  setDecidedSummaryShown: (v: boolean) => void
  // In-memory only (see partialize below) - resets on every app launch, and
  // can be flipped back to false from Profile to reopen a dismissed modal.
  dismissed: boolean
  setDismissed: (v: boolean) => void
}

// Tracks whether the "here's what's active now" summary has already been
// shown for the current archive-lock episode, so it only appears once per
// downgrade, not on every app open.
export const useDowngradeUiStore = create<DowngradeUiState>()(
  persist(
    (set) => ({
      decidedSummaryShown: false,
      setDecidedSummaryShown: (v) => set({ decidedSummaryShown: v }),
      dismissed: false,
      setDismissed: (v) => set({ dismissed: v }),
    }),
    {
      name: 'macrotrack-downgrade-ui',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ decidedSummaryShown: state.decidedSummaryShown }),
    }
  )
)
