import { ReactNode } from 'react'
import { Pressable, PressableProps, ViewStyle, StyleProp, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated'

const AnimatedView = Animated.createAnimatedComponent(Animated.View)

// Properties that determine how this element is sized/positioned as a flex
// item within ITS PARENT (e.g. a percentage flexBasis in a wrapped grid).
// These must live on the outer Pressable - that's the node the parent's
// Yoga layout actually measures. Everything else (background, padding,
// border, internal flexDirection for the children) stays on the inner
// animated view, which stretch-fills the Pressable by default.
const LAYOUT_KEYS = new Set([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
  'alignSelf', 'position', 'top', 'left', 'right', 'bottom', 'start', 'end', 'zIndex',
])

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

  const flatStyle = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>
  const outerStyle: Record<string, unknown> = {}
  const innerStyle: Record<string, unknown> = {}
  for (const key of Object.keys(flatStyle)) {
    ;(LAYOUT_KEYS.has(key) ? outerStyle : innerStyle)[key] = flatStyle[key]
  }

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
      style={outerStyle as ViewStyle}
      {...rest}
    >
      <AnimatedView style={[innerStyle as ViewStyle, animatedStyle]}>{children}</AnimatedView>
    </Pressable>
  )
}
