import i18next from '../i18n'
import type { TourStepData } from '../contexts/TourContext'

// Every step's target position is resolved live (see TourContext/TourTarget)
// from the actual rendered element - never computed from screen dimensions.
// That's what keeps this correct on any device size/density, and what fixed
// the spotlight exceeding the tab bar buttons' real bounds.
//
// Title/body are resolved through i18next at call time (not React state), so
// they always reflect whatever language is active when the tour starts.

function tabSteps(): TourStepData[] {
  const t = i18next.t.bind(i18next)
  return [
    { id: 'tab_Dashboard', title: t('tour.tabDashboardTitle'), body: t('tour.tabDashboardBody'), navigateTo: 'Dashboard' },
    { id: 'tab_Log', title: t('tour.tabLogTitle'), body: t('tour.tabLogBody'), navigateTo: 'Log' },
    { id: 'tab_Meals', title: t('tour.tabMealsTitle'), body: t('tour.tabMealsBody'), navigateTo: 'Meals' },
    { id: 'tab_Progress', title: t('tour.tabProgressTitle'), body: t('tour.tabProgressBody'), navigateTo: 'Progress' },
    { id: 'tab_Profile', title: t('tour.tabProfileTitle'), body: t('tour.tabProfileBody'), navigateTo: 'Profile' },
  ]
}

// Shown only on the full replay tour, not the first-login one - covers the
// features that are easy to miss, including clarifying the two different
// scan buttons (daily log vs. saved meal) side by side.
function featureSteps(): TourStepData[] {
  const t = i18next.t.bind(i18next)
  return [
    { id: 'tip_log_share', title: t('tour.tipLogShareTitle'), body: t('tour.tipLogShareBody'), navigateTo: 'Log' },
    { id: 'tip_log_scan', title: t('tour.tipLogScanTitle'), body: t('tour.tipLogScanBody'), navigateTo: 'Log' },
    { id: 'tip_meal_new', title: t('tour.tipMealNewTitle'), body: t('tour.tipMealNewBody'), navigateTo: 'Meals' },
    { id: 'tip_meal_scan', title: t('tour.tipMealScanTitle'), body: t('tour.tipMealScanBody'), navigateTo: 'Meals' },
    { id: 'tip_settings', title: t('tour.tipSettingsTitle'), body: t('tour.tipSettingsBody'), navigateTo: 'Dashboard' },
    { id: 'tip_weight_log', title: t('tour.tipWeightLogTitle'), body: t('tour.tipWeightLogBody'), navigateTo: 'Dashboard' },
  ]
}

export function getFirstLoginTourSteps(): TourStepData[] {
  return tabSteps()
}

export function getFullTourSteps(): TourStepData[] {
  return [...tabSteps(), ...featureSteps()]
}
