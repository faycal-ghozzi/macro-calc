import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/contexts/AuthContext'
import { ThemeProvider } from './src/theme/ThemeProvider'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { RootNavigator } from './src/navigation/RootNavigator'
import { EntitlementsProvider } from './src/hooks/useEntitlements'
import { MealsProvider } from './src/hooks/useMeals'
import { FavoritesProvider } from './src/hooks/useFavorites'
import { ProfileProvider } from './src/hooks/useProfile'
import { WeightLogProvider } from './src/hooks/useWeightLog'
import { ReportsProvider } from './src/hooks/useReports'
import { FoodLogProvider } from './src/hooks/useFoodLog'
import { ExerciseLogProvider } from './src/hooks/useExerciseLog'
import { TourProvider } from './src/contexts/TourContext'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <ProfileProvider>
                <EntitlementsProvider>
                  <MealsProvider>
                    <FavoritesProvider>
                      <WeightLogProvider>
                        <ReportsProvider>
                          <FoodLogProvider>
                            <ExerciseLogProvider>
                              <TourProvider>
                                <RootNavigator />
                              </TourProvider>
                            </ExerciseLogProvider>
                          </FoodLogProvider>
                        </ReportsProvider>
                      </WeightLogProvider>
                    </FavoritesProvider>
                  </MealsProvider>
                </EntitlementsProvider>
              </ProfileProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
