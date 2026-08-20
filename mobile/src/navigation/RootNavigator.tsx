import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import { TabNavigator } from './TabNavigator'
import AuthScreen from '../screens/AuthScreen'

export function RootNavigator() {
  const { user, loading } = useAuth()
  const theme = useTheme()

  if (loading) {
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

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <TabNavigator /> : <AuthScreen />}
    </NavigationContainer>
  )
}
