import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

export function LoadingState({ minHeight = 200 }: { minHeight?: number }) {
  const theme = useTheme()
  return (
    <View style={[styles.container, { minHeight }]}>
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
})
