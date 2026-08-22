import type { TourStepData } from '../contexts/TourContext'

// Every step's target position is resolved live (see TourContext/TourTarget)
// from the actual rendered element - never computed from screen dimensions.
// That's what keeps this correct on any device size/density, and what fixed
// the spotlight exceeding the tab bar buttons' real bounds.

const TAB_STEPS: TourStepData[] = [
  { id: 'tab_Dashboard', title: 'Your daily overview', body: "See today's calories, macros, and meals at a glance.", navigateTo: 'Dashboard' },
  { id: 'tab_Log', title: 'Log your food', body: 'Search, scan a barcode, or pick a saved meal to add it to your day.', navigateTo: 'Log' },
  { id: 'tab_Meals', title: 'Save meals you eat often', body: 'Build a meal once, then add it to your log in one tap.', navigateTo: 'Meals' },
  { id: 'tab_Progress', title: 'Track your trends', body: 'Weekly reports and your weight history live here.', navigateTo: 'Progress' },
  { id: 'tab_Profile', title: 'Your profile & settings', body: 'Update your targets, theme, and subscription here.', navigateTo: 'Profile' },
]

// Shown only on the full replay tour, not the first-login one - covers the
// features that are easy to miss, including clarifying the two different
// scan buttons (daily log vs. saved meal) side by side.
const FEATURE_STEPS: TourStepData[] = [
  { id: 'tip_log_share', title: 'Share your daily log', body: 'Generate a QR code of your whole day for a friend to scan and import.', navigateTo: 'Log' },
  { id: 'tip_log_scan', title: 'Copy a daily log', body: "This scan is for copying someone else's daily log into yours.", navigateTo: 'Log' },
  { id: 'tip_meal_new', title: 'Create a new meal', body: 'Build a meal from ingredients you use often, so you can add it in one tap later.', navigateTo: 'Meals' },
  { id: 'tip_meal_scan', title: 'Copy a meal', body: "This scan is for copying someone else's saved meal, different from the daily-log scan above.", navigateTo: 'Meals' },
]

export function getFirstLoginTourSteps(): TourStepData[] {
  return TAB_STEPS
}

export function getFullTourSteps(): TourStepData[] {
  return [...TAB_STEPS, ...FEATURE_STEPS]
}
