import type { TourStepData } from '../contexts/TourContext'

const TAB_BAR_HEIGHT = 82

const TAB_ORDER = ['Dashboard', 'Log', 'Meals', 'Progress', 'Profile'] as const

const TAB_CONTENT: Record<(typeof TAB_ORDER)[number], { title: string; body: string }> = {
  Dashboard: { title: 'Your daily overview', body: "See today's calories, macros, and meals at a glance." },
  Log: { title: 'Log your food', body: 'Search, scan a barcode, or pick a saved meal to add it to your day.' },
  Meals: { title: 'Save meals you eat often', body: 'Build a meal once, then add it to your log in one tap.' },
  Progress: { title: 'Track your trends', body: 'Weekly reports and your weight history live here.' },
  Profile: { title: 'Your profile & settings', body: 'Update your targets, theme, and subscription here.' },
}

// Tab bar icon positions are computed rather than measured, since the tab
// bar is a simple, fixed, symmetric layout - avoids forwarding refs into
// React Navigation's internal tabBarIcon render props.
export function getFirstLoginTourSteps(screenWidth: number, screenHeight: number, bottomInset: number): TourStepData[] {
  const tabWidth = screenWidth / TAB_ORDER.length
  const barTop = screenHeight - TAB_BAR_HEIGHT - bottomInset

  return TAB_ORDER.map((tab, i) => ({
    id: `firstlogin_${tab}`,
    title: TAB_CONTENT[tab].title,
    body: TAB_CONTENT[tab].body,
    rect: { x: tabWidth * i, y: barTop, width: tabWidth, height: TAB_BAR_HEIGHT },
  }))
}
