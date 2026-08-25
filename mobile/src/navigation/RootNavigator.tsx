import { useEffect, useRef, useState } from 'react'
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { isDeletionPending } from '../lib/accountDeletion'
import { useTheme } from '../theme/ThemeProvider'
import { useTour } from '../contexts/TourContext'
import { getFirstLoginTourSteps } from '../lib/tourSteps'
import { TabNavigator } from './TabNavigator'
import AuthScreen from '../screens/AuthScreen'
import AccountPendingDeletionScreen from '../screens/AccountPendingDeletionScreen'
import { DowngradeStatusModal } from '../screens/DowngradeStatusModal'
import { TourOverlay } from '../components/TourOverlay'
import { SplashScreen } from '../components/SplashScreen'

export function RootNavigator() {
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const theme = useTheme()
  const { startSequence } = useTour()
  const startedRef = useRef(false)
  // Keeps the splash up for a minimum stretch so its animation/logo is
  // actually seen even when auth/profile load faster than that - tapping
  // (see SplashScreen's onPress) skips the wait, not the real data load.
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashTimeElapsed(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    if (loading || profileLoading) return
    if (!user) return
    // A transient null here (e.g. the persisted session's access token still
    // mid-refresh right after a cold start, causing an RLS-rejected fetch)
    // is indistinguishable from "no profile" - wait for a real value instead
    // of locking in a decision from it via startedRef.
    if (!profile) return
    if (isDeletionPending(profile) || profile.has_seen_first_login_tour) return
    startedRef.current = true
    startSequence(getFirstLoginTourSteps())
  }, [loading, profileLoading, user, profile, startSequence])

  const dataReady = !loading && !(user && profileLoading)

  if (!dataReady || !minSplashTimeElapsed) {
    return (
      <Animated.View style={{ flex: 1 }} exiting={FadeOut.duration(350)}>
        <SplashScreen onPress={() => setMinSplashTimeElapsed(true)} />
      </Animated.View>
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
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(350)}>
      <NavigationContainer theme={navTheme}>
        {content}
        {user && !deletionPending && <DowngradeStatusModal />}
        {user && !deletionPending && <TourOverlay />}
      </NavigationContainer>
    </Animated.View>
  )
}
