import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import type { NavigatorScreenParams } from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { View, Pressable, StyleSheet, Platform } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, interpolateColor, withTiming, withRepeat, Easing } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { BlurView } from '@react-native-community/blur'
import DashboardScreen from '../screens/DashboardScreen'
import FoodLogScreen from '../screens/FoodLogScreen'
import MealsScreen from '../screens/MealsScreen'
import ProgressScreen from '../screens/ProgressScreen'
import { ProfileStackNavigator } from './ProfileStackNavigator'
import type { ProfileStackParamList } from './ProfileStackNavigator'
import { useTheme } from '../theme/ThemeProvider'
import { useTour } from '../contexts/TourContext'
import type { MealType } from '../types'

export type TabParamList = {
  Dashboard: undefined
  Log: { meal?: MealType; date?: string } | undefined
  Meals: undefined
  Progress: undefined
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined
}

const Tab = createBottomTabNavigator<TabParamList>()
const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable)

function AnimatedTabButton(props: BottomTabBarButtonProps & { tabId: string }) {
  const { tabId, ...rest } = props
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const ref = useRef<View>(null)
  const { registerTarget } = useTour()

  return (
    <AnimatedPressableBase
      {...(rest as any)}
      ref={ref}
      style={[rest.style, animatedStyle]}
      onLayout={(e) => {
        rest.onLayout?.(e)
        requestAnimationFrame(() => {
          ;(ref.current as unknown as View | null)?.measureInWindow((x, y, width, height) => {
            registerTarget(tabId, { x, y, width, height })
          })
        })
      }}
      onPressIn={(e) => {
        scale.value = withTiming(0.92, { duration: 100, easing: Easing.out(Easing.quad) })
        rest.onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) })
        rest.onPressOut?.(e)
      }}
      onPress={(e) => {
        Haptics.selectionAsync()
        rest.onPress?.(e)
      }}
    />
  )
}

// Measures the tab bar's own on-screen bounds and registers them (id
// 'tabbar') so TourOverlay can keep this whole row undimmed during a
// toolbar tour step, rather than dimming everything but a hole around the
// one target button.
function MeasuredTabBarBackground({ children }: { children: ReactNode }) {
  const ref = useRef<View>(null)
  const { registerTarget } = useTour()

  return (
    <View
      ref={ref}
      style={StyleSheet.absoluteFill}
      onLayout={() => {
        const measure = () => {
          ref.current?.measureInWindow((x, y, width, height) => {
            registerTarget('tabbar', { x, y, width, height })
          })
        }
        requestAnimationFrame(measure)
        setTimeout(measure, 200)
        setTimeout(measure, 500)
      }}
    >
      {children}
    </View>
  )
}

const TOUR_PULSE_MS = 650

// The toolbar has no spotlight or glow-ring during the tour - the target
// tab's own normal "selected" pill (styles.activeDot) pulses in place
// instead, so there's nothing extra layered on top and no separate box to
// keep in sync with the pill's real size.
function TabIcon({ routeName, color, size, focused }: { routeName: keyof TabParamList; color: string; size: number; focused: boolean }) {
  const theme = useTheme()
  const { activeStep } = useTour()
  const isTourTarget = focused && activeStep?.id === `tab_${routeName}`
  const pulse = useSharedValue(0)

  useEffect(() => {
    pulse.value = isTourTarget
      ? withRepeat(withTiming(1, { duration: TOUR_PULSE_MS, easing: Easing.inOut(Easing.sin) }), -1, true)
      : withTiming(0, { duration: 150 })
  }, [isTourTarget, pulse])

  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pulse.value, [0, 1], [theme.colors.accentSoft, theme.colors.accent]),
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35 + pulse.value * 0.45,
    shadowRadius: 3 + pulse.value * 9,
    elevation: 3 + pulse.value * 7,
  }))

  const icon = <Ionicons name={ICONS[routeName]} size={size - 2} color={color} />

  if (!focused) return <View>{icon}</View>
  if (!isTourTarget) return <View style={[styles.activeDot, { backgroundColor: theme.colors.accentSoft }]}>{icon}</View>
  return <Animated.View style={[styles.activeDot, glowStyle]}>{icon}</Animated.View>
}

const ICONS: Record<keyof TabParamList, string> = {
  Dashboard: 'home',
  Log: 'restaurant',
  Meals: 'book',
  Progress: 'trending-up',
  Profile: 'person',
}

const TAB_LABEL_KEYS: Record<keyof TabParamList, string> = {
  Dashboard: 'tabs.dashboard',
  Log: 'tabs.log',
  Meals: 'tabs.meals',
  Progress: 'tabs.progress',
  Profile: 'tabs.profile',
}

export function TabNavigator() {
  const theme = useTheme()
  const { t } = useTranslation()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: t(TAB_LABEL_KEYS[route.name as keyof TabParamList]),
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
          <MeasuredTabBarBackground>
            {/* @react-native-community/blur's Android implementation is unreliable -
                on many devices it renders as a heavy dark tint instead of an actual
                blur (most visible with blurType "dark"), so Android gets a plain
                tinted background instead of a real blur. iOS keeps the real blur. */}
            {Platform.OS === 'ios' ? (
              <BlurView
                blurAmount={theme.mode === 'dark' ? 20 : 30}
                blurType={theme.mode === 'dark' ? 'dark' : 'light'}
                style={[StyleSheet.absoluteFill, { borderTopWidth: 1, borderTopColor: theme.colors.cardBorder, backgroundColor: theme.colors.background + (theme.mode === 'dark' ? 'CC' : 'EE') }]}
              />
            ) : (
              <View
                style={[StyleSheet.absoluteFill, { borderTopWidth: 1, borderTopColor: theme.colors.cardBorder, backgroundColor: theme.colors.background + (theme.mode === 'dark' ? 'F2' : 'FA') }]}
              />
            )}
          </MeasuredTabBarBackground>
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
        tabBarIcon: ({ color, size, focused }) => (
          <TabIcon routeName={route.name as keyof TabParamList} color={color} size={size} focused={focused} />
        ),
        tabBarButton: (props) => <AnimatedTabButton {...props} tabId={`tab_${route.name}`} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Log" component={FoodLogScreen} />
      <Tab.Screen name="Meals" component={MealsScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
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
