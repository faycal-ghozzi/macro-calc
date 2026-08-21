import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/contexts/AuthContext'
import { ThemeProvider } from './src/theme/ThemeProvider'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { RootNavigator } from './src/navigation/RootNavigator'
import { EntitlementsProvider } from './src/hooks/useEntitlements'
import { MealsProvider } from './src/hooks/useMeals'
import { FavoritesProvider } from './src/hooks/useFavorites'
import { TourProvider } from './src/contexts/TourContext'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <EntitlementsProvider>
                <MealsProvider>
                  <FavoritesProvider>
                    <TourProvider>
                      <RootNavigator />
                    </TourProvider>
                  </FavoritesProvider>
                </MealsProvider>
              </EntitlementsProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
