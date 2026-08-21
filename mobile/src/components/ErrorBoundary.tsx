import { Component, ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useThemeStore } from '../store/useThemeStore'
import { THEMES } from '../theme/themes'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// This boundary sits above ThemeProvider (it needs to catch crashes from
// ThemeProvider's own subtree too), so its fallback can't use useTheme().
// Reading the zustand store directly works from anywhere, hooks or not.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      const theme = THEMES[useThemeStore.getState().themeId]
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="warning-outline" size={32} color={theme.colors.danger} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>This screen hit a snag</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{this.state.error.message}</Text>
          <Pressable onPress={this.reset} style={[styles.button, { backgroundColor: theme.colors.accentSoft }]}>
            <Text style={[styles.buttonText, { color: theme.colors.accent }]}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  message: { fontSize: 13, textAlign: 'center' },
  button: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  buttonText: { fontWeight: '600', fontSize: 13 },
})
