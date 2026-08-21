import { ReactNode } from 'react'
import { View, ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { AnimatedPressable } from './AnimatedPressable'

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
      <AnimatedPressable onPress={onPress} style={cardStyle} scaleTo={0.98}>
        {children}
      </AnimatedPressable>
    )
  }

  return <View style={cardStyle}>{children}</View>
}
