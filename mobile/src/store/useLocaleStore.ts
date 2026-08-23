import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface LocaleState {
  // null means "follow the system language" - the common case until the
  // user explicitly picks one in Settings.
  languageOverride: string | null
  setLanguageOverride: (code: string | null) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      languageOverride: null,
      setLanguageOverride: (code) => set({ languageOverride: code }),
    }),
    {
      name: 'macrotrack-locale',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
