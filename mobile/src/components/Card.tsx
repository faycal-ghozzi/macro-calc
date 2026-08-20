import { ReactNode } from 'react'
import { View, ViewStyle, Pressable } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

interface CardProps {
  children: ReactNode
  style?: ViewStyle
  onPress?: () => void
}

export function Card({ children, style, onPress }: CardProps) {
  const theme = useTheme()
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.card,
    borderRadius: theme.style.cardRadius,
    borderWidth: theme.style.cardBorderWidth,
    borderColor: theme.colors.cardBorder,
    padding: 18,
    ...style,
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.85 : 1 }]}
      >
        {children}
      </Pressable>
    )
  }

  return <View style={cardStyle}>{children}</View>
}
