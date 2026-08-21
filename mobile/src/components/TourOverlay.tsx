import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useTour } from '../contexts/TourContext'

const SPOTLIGHT_PADDING = 8
const TOOLTIP_GAP = 16

export function TourOverlay() {
  const theme = useTheme()
  const { activeStep, next, skip } = useTour()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  if (!activeStep) return null
  const { rect, title, body, stepNumber, totalSteps, kind } = activeStep

  const holeTop = Math.max(0, rect.y - SPOTLIGHT_PADDING)
  const holeBottom = Math.min(screenHeight, rect.y + rect.height + SPOTLIGHT_PADDING)
  const holeLeft = Math.max(0, rect.x - SPOTLIGHT_PADDING)
  const holeRight = Math.min(screenWidth, rect.x + rect.width + SPOTLIGHT_PADDING)

  const placeBelow = holeTop > screenHeight * 0.55
  const tooltipTop = placeBelow ? undefined : Math.min(holeBottom + TOOLTIP_GAP, screenHeight - insets.bottom - 160)
  const tooltipBottom = placeBelow ? screenHeight - holeTop + TOOLTIP_GAP : undefined

  return (
    <Modal visible transparent animationType="fade" onRequestClose={skip}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Dimmed cutout: four rects framing the spotlight hole */}
        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: holeTop, backgroundColor: theme.colors.overlay }]} />
        <View style={[styles.dim, { top: holeBottom, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.overlay }]} />
        <View style={[styles.dim, { top: holeTop, left: 0, width: holeLeft, height: holeBottom - holeTop, backgroundColor: theme.colors.overlay }]} />
        <View style={[styles.dim, { top: holeTop, left: holeRight, right: 0, height: holeBottom - holeTop, backgroundColor: theme.colors.overlay }]} />

        <View
          pointerEvents="none"
          style={[
            styles.spotlightBorder,
            {
              top: holeTop,
              left: holeLeft,
              width: holeRight - holeLeft,
              height: holeBottom - holeTop,
              borderColor: theme.colors.accent,
              borderRadius: theme.style.cardRadius - 6,
            },
          ]}
        />

        <View
          style={[
            styles.tooltip,
            {
              top: tooltipTop,
              bottom: tooltipBottom,
              left: 20,
              right: 20,
              backgroundColor: theme.colors.card,
              borderRadius: theme.style.cardRadius,
              borderColor: theme.colors.cardBorder,
              borderWidth: theme.style.cardBorderWidth,
            },
          ]}
        >
          {totalSteps > 1 && (
            <Text style={[styles.stepCount, { color: theme.colors.textTertiary }]}>{stepNumber} / {totalSteps}</Text>
          )}
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{body}</Text>

          <View style={styles.actions}>
            {kind === 'sequence' && stepNumber < totalSteps && (
              <Pressable onPress={() => { Haptics.selectionAsync(); skip() }} style={styles.skipButton}>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 13, fontWeight: '600' }}>Skip</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); next() }}
              style={[styles.nextButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8 }]}
            >
              <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>
                {kind === 'tip' || stepNumber === totalSteps ? 'Got it' : 'Next'}
              </Text>
              {kind === 'sequence' && stepNumber < totalSteps && (
                <Ionicons name="chevron-forward" size={16} color={theme.colors.onAccent} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  dim: { position: 'absolute' },
  spotlightBorder: { position: 'absolute', borderWidth: 2 },
  tooltip: { position: 'absolute', padding: 18 },
  stepCount: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 16 },
  skipButton: { paddingVertical: 8, paddingHorizontal: 4 },
  nextButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18, paddingVertical: 10 },
})
