import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ReminderMode = 'off' | 'three' | 'one'

interface NotificationState {
  mode: ReminderMode
  breakfastTime: string
  lunchTime: string
  dinnerTime: string
  singleTime: string
  setMode: (mode: ReminderMode) => void
  setTime: (key: 'breakfastTime' | 'lunchTime' | 'dinnerTime' | 'singleTime', value: string) => void
}

// Times are stored as "HH:mm" 24h strings - unambiguous and locale-independent;
// only converted to a Date for display/picking at the UI edge.
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      mode: 'off',
      breakfastTime: '08:00',
      lunchTime: '12:30',
      dinnerTime: '18:30',
      singleTime: '19:00',
      setMode: (mode) => set({ mode }),
      setTime: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'macrotrack-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
