import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { isDeletionPending } from '../lib/accountDeletion'
import { useTheme } from '../theme/ThemeProvider'
import { TabNavigator } from './TabNavigator'
import AuthScreen from '../screens/AuthScreen'
import AccountPendingDeletionScreen from '../screens/AccountPendingDeletionScreen'

export function RootNavigator() {
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const theme = useTheme()

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

  let content = <AuthScreen />
  if (user) content = isDeletionPending(profile) ? <AccountPendingDeletionScreen /> : <TabNavigator />

  return (
    <NavigationContainer theme={navTheme}>
      {content}
    </NavigationContainer>
  )
}
