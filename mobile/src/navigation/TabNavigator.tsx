import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from '../lib/haptics'
import { BlurView } from '@react-native-community/blur'
import DashboardScreen from '../screens/DashboardScreen'
import FoodLogScreen from '../screens/FoodLogScreen'
import MealsScreen from '../screens/MealsScreen'
import ProgressScreen from '../screens/ProgressScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { useTheme } from '../theme/ThemeProvider'
import type { MealType } from '../types'

export type TabParamList = {
  Dashboard: undefined
  Log: { meal?: MealType; date?: string } | undefined
  Meals: undefined
  Progress: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

const ICONS: Record<keyof TabParamList, string> = {
  Dashboard: 'home',
  Log: 'restaurant',
  Meals: 'book',
  Progress: 'trending-up',
  Profile: 'person',
}

export function TabNavigator() {
  const theme = useTheme()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          height: 82,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <BlurView
            blurAmount={theme.mode === 'dark' ? 20 : 30}
            blurType={theme.mode === 'dark' ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, { borderTopWidth: 1, borderTopColor: theme.colors.cardBorder, backgroundColor: theme.colors.background + (theme.mode === 'dark' ? 'CC' : 'EE') }]}
          />
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
        tabBarIcon: ({ color, size, focused }) => (
          <View style={focused ? [styles.activeDot, { backgroundColor: theme.colors.accentSoft }] : undefined}>
            <Ionicons name={ICONS[route.name as keyof TabParamList]} size={size - 2} color={color} />
          </View>
        ),
        tabBarButton: (props) => (
          <Pressable
            {...(props as any)}
            onPress={(e) => {
              Haptics.selectionAsync()
              props.onPress?.(e)
            }}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Log" component={FoodLogScreen} />
      <Tab.Screen name="Meals" component={MealsScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  activeDot: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
