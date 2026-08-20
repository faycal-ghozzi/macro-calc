import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTheme } from '../theme/ThemeProvider'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  const theme = useTheme()
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={28} color={theme.colors.danger} />
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.colors.accentSoft, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 13 }}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 10 },
  message: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginTop: 4 },
})
