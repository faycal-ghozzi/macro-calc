import { useEffect } from 'react'
import { Platform } from 'react-native'
import notifee, { AndroidImportance, AuthorizationStatus, RepeatFrequency, TriggerType } from '@notifee/react-native'
import i18next from '../i18n'
import { useNotificationStore, ReminderMode } from '../store/useNotificationStore'

const CHANNEL_ID = 'meal-reminders'

const NOTIF_ID = {
  breakfast: 'meal-reminder-breakfast',
  lunch: 'meal-reminder-lunch',
  dinner: 'meal-reminder-dinner',
  single: 'meal-reminder-single',
} as const

interface ReminderSettings {
  mode: ReminderMode
  breakfastTime: string
  lunchTime: string
  dinnerTime: string
  singleTime: string
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission()
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED
}

export async function hasNotificationPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings()
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED
}

async function ensureChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined
  return notifee.createChannel({ id: CHANNEL_ID, name: 'Meal Reminders', importance: AndroidImportance.DEFAULT })
}

// Next occurrence of an "HH:mm" time - today if it hasn't passed yet,
// tomorrow otherwise. repeatFrequency then keeps it firing daily from there.
function nextTrigger(hhmm: string) {
  const [hours, minutes] = hhmm.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1)
  return {
    type: TriggerType.TIMESTAMP as const,
    timestamp: date.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  }
}

async function scheduleOne(id: string, titleKey: string, bodyKey: string, time: string, channelId: string | undefined) {
  const t = i18next.t.bind(i18next)
  await notifee.createTriggerNotification(
    {
      id,
      title: t(titleKey),
      body: t(bodyKey),
      android: { channelId: channelId ?? CHANNEL_ID, pressAction: { id: 'default' } },
    },
    nextTrigger(time)
  )
}

export async function cancelAllMealReminders() {
  await notifee.cancelTriggerNotification(NOTIF_ID.breakfast)
  await notifee.cancelTriggerNotification(NOTIF_ID.lunch)
  await notifee.cancelTriggerNotification(NOTIF_ID.dinner)
  await notifee.cancelTriggerNotification(NOTIF_ID.single)
}

// Idempotent - always cancels everything first, then reschedules only what
// the current mode calls for. Safe to call repeatedly (e.g. on every launch).
export async function syncMealReminders(settings: ReminderSettings) {
  await cancelAllMealReminders()
  if (settings.mode === 'off') return

  const channelId = await ensureChannel()

  if (settings.mode === 'three') {
    await scheduleOne(NOTIF_ID.breakfast, 'notifications.breakfastTitle', 'notifications.breakfastBody', settings.breakfastTime, channelId)
    await scheduleOne(NOTIF_ID.lunch, 'notifications.lunchTitle', 'notifications.lunchBody', settings.lunchTime, channelId)
    await scheduleOne(NOTIF_ID.dinner, 'notifications.dinnerTitle', 'notifications.dinnerBody', settings.dinnerTime, channelId)
  } else {
    await scheduleOne(NOTIF_ID.single, 'notifications.singleTitle', 'notifications.singleBody', settings.singleTime, channelId)
  }
}

// Re-syncs whatever's already scheduled on every app launch, without ever
// prompting for permission itself - if the OS permission was revoked since
// the setting was turned on, this just quietly does nothing until the user
// revisits Profile and the picker re-requests it.
export function useSyncNotificationsOnLaunch() {
  useEffect(() => {
    const sync = async () => {
      const state = useNotificationStore.getState()
      if (state.mode === 'off') return
      if (await hasNotificationPermission()) {
        syncMealReminders(state)
      }
    }
    if (useNotificationStore.persist.hasHydrated()) {
      sync()
      return
    }
    return useNotificationStore.persist.onFinishHydration(sync)
  }, [])
}
