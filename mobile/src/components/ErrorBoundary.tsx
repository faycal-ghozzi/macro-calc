import { Component, ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

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
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={32} color="#F87171" />
          <Text style={styles.title}>This screen hit a snag</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D10', padding: 24, gap: 10 },
  title: { color: '#F5F6F7', fontSize: 16, fontWeight: '600', marginTop: 4 },
  message: { color: '#9BA3AE', fontSize: 13, textAlign: 'center' },
  button: { marginTop: 12, backgroundColor: 'rgba(52,211,153,0.14)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  buttonText: { color: '#34D399', fontWeight: '600', fontSize: 13 },
})
