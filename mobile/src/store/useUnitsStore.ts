import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type UnitSystem = 'metric' | 'imperial'

interface UnitsState {
  system: UnitSystem
  setSystem: (system: UnitSystem) => void
}

export const useUnitsStore = create<UnitsState>()(
  persist(
    (set) => ({
      system: 'metric',
      setSystem: (system) => set({ system }),
    }),
    {
      name: 'macrotrack-units',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
