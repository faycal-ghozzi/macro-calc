import { createContext, useContext, ReactNode } from 'react'
import { useThemeStore } from '../store/useThemeStore'
import { THEMES, Theme } from './themes'

const ThemeContext = createContext<Theme>(THEMES.dark)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useThemeStore((s) => s.themeId)
  const theme = THEMES[themeId]

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
