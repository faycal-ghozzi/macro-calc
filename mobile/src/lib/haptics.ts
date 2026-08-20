import ReactNativeHapticFeedback from 'react-native-haptic-feedback'

export const NotificationFeedbackType = {
  Success: 'notificationSuccess',
  Warning: 'notificationWarning',
  Error: 'notificationError',
} as const

export const ImpactFeedbackStyle = {
  Light: 'impactLight',
  Medium: 'impactMedium',
  Heavy: 'impactHeavy',
  Rigid: 'impactHeavy',
  Soft: 'impactLight',
} as const

const options = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false }

export async function selectionAsync() {
  ReactNativeHapticFeedback.trigger('selection', options)
}

export async function notificationAsync(type: (typeof NotificationFeedbackType)[keyof typeof NotificationFeedbackType]) {
  ReactNativeHapticFeedback.trigger(type, options)
}

export async function impactAsync(style: (typeof ImpactFeedbackStyle)[keyof typeof ImpactFeedbackStyle]) {
  ReactNativeHapticFeedback.trigger(style, options)
}
