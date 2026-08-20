import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThemeId } from '../theme/themes'

interface ThemeState {
  themeId: ThemeId
  setThemeId: (id: ThemeId) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'dark',
      setThemeId: (id) => set({ themeId: id }),
    }),
    {
      name: 'macrotrack-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
