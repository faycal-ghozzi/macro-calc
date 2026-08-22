import { useEffect, useRef } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { isDeletionPending } from '../lib/accountDeletion'
import { useTheme } from '../theme/ThemeProvider'
import { useTour } from '../contexts/TourContext'
import { useTourProgressStore } from '../store/useTourProgressStore'
import { getFirstLoginTourSteps } from '../lib/tourSteps'
import { TabNavigator } from './TabNavigator'
import AuthScreen from '../screens/AuthScreen'
import AccountPendingDeletionScreen from '../screens/AccountPendingDeletionScreen'
import { DowngradeStatusModal } from '../screens/DowngradeStatusModal'
import { TourOverlay } from '../components/TourOverlay'

export function RootNavigator() {
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const theme = useTheme()
  const { startSequence } = useTour()
  const hasSeenFirstLoginTour = useTourProgressStore((s) => s.hasSeenFirstLoginTour)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    if (loading || profileLoading) return
    if (!user || isDeletionPending(profile) || hasSeenFirstLoginTour) return
    startedRef.current = true
    startSequence(getFirstLoginTourSteps())
  }, [loading, profileLoading, user, profile, hasSeenFirstLoginTour, startSequence])

  if (loading || (user && profileLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    )
  }

  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.textPrimary,
      border: theme.colors.cardBorder,
      primary: theme.colors.accent,
    },
  }

  const deletionPending = user && isDeletionPending(profile)
  let content = <AuthScreen />
  if (user) content = deletionPending ? <AccountPendingDeletionScreen /> : <TabNavigator />

  return (
    <NavigationContainer theme={navTheme}>
      {content}
      {user && !deletionPending && <DowngradeStatusModal />}
      {user && !deletionPending && <TourOverlay />}
    </NavigationContainer>
  )
}
