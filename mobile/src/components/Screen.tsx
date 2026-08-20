import { ReactNode } from 'react'
import { View, StyleSheet, ScrollView, ScrollViewProps, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'

interface ScreenProps {
  children: ReactNode
  scroll?: boolean
  contentContainerStyle?: ScrollViewProps['contentContainerStyle']
}

export function Screen({ children, scroll = true, contentContainerStyle }: ScreenProps) {
  const theme = useTheme()

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[{ paddingBottom: 120 }, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
