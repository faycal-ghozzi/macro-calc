import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ProfileScreen from '../screens/ProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'

export type ProfileStackParamList = {
  ProfileMain: undefined
  Settings: undefined
}

const Stack = createNativeStackNavigator<ProfileStackParamList>()

// Headers are hidden here the same way they are everywhere else in the app -
// each screen renders its own title/back button inline (see ModalScreen's
// pattern) instead of using React Navigation's native header bar.
export function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  )
}
