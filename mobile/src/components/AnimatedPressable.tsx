import { ReactNode } from 'react'
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated'

const AnimatedView = Animated.createAnimatedComponent(Animated.View)

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  scaleTo?: number
}

// A drop-in Pressable with a subtle scale-down/spring-back on press, so
// buttons feel tactile beyond the default opacity change. Reuses the same
// reanimated dependency already proven in ProgressRing/MacroBar.
export function AnimatedPressable({ children, style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: AnimatedPressableProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Pressable
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 100, easing: Easing.out(Easing.quad) })
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) })
        onPressOut?.(e)
      }}
      {...rest}
    >
      <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>
    </Pressable>
  )
}
