import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, Animated, Platform, PermissionsAndroid } from 'react-native'
import { Camera, CameraType, type CameraApi, type CodeFormat } from 'react-native-camera-kit'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'

interface CameraScannerModalProps {
  visible: boolean
  title: string
  hint: string
  types: CodeFormat[]
  /** Shape of the code being scanned, so the detection indicator matches
   * reality: QR codes are square, barcodes are wide. */
  shape: 'square' | 'wide'
  onScan: (data: string) => void
  onClose: () => void
}

const ZOOM_PRESETS = [1, 2, 3]
const DETECTION_HOLD_MS = 700
const GREEN = '#22C55E'

export function CameraScannerModal({ visible, title, hint, types, shape, onScan, onClose }: CameraScannerModalProps) {
  const theme = useTheme()
  const cameraRef = useRef<CameraApi>(null)
  const firedRef = useRef(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [detected, setDetected] = useState(false)
  const detectedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulse = useRef(new Animated.Value(0)).current

  // react-native-camera-kit doesn't implement permission checks on Android
  // (throws "Not implemented" - see its README), so Android uses the core
  // PermissionsAndroid API directly instead of the camera-kit ref methods.
  async function checkPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)
    }
    return !!(await cameraRef.current?.checkDeviceCameraAuthorizationStatus())
  }

  async function requestPermission() {
    let granted: boolean
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
      granted = result === PermissionsAndroid.RESULTS.GRANTED
    } else {
      granted = !!(await cameraRef.current?.requestDeviceCameraAuthorization())
    }
    setHasPermission(granted)
  }

  useEffect(() => {
    if (!visible) return
    firedRef.current = false
    setTorchOn(false)
    setZoom(1)
    setDetected(false)
    pulse.setValue(0)
    checkPermission().then(setHasPermission)
  }, [visible])

  function handleReadCode(event: { nativeEvent: { codeStringValue: string } }) {
    setDetected(true)
    Animated.spring(pulse, { toValue: 1, useNativeDriver: true, friction: 6 }).start()
    if (detectedTimeout.current) clearTimeout(detectedTimeout.current)
    detectedTimeout.current = setTimeout(() => {
      Animated.timing(pulse, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setDetected(false))
    }, DETECTION_HOLD_MS)

    if (firedRef.current) return
    firedRef.current = true
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onScan(event.nativeEvent.codeStringValue)
  }

  function toggleTorch() {
    Haptics.selectionAsync()
    setTorchOn((v) => !v)
  }

  function selectZoom(z: number) {
    Haptics.selectionAsync()
    setZoom(z)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {hasPermission === false ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={32} color={theme.colors.textTertiary} />
              <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
                Camera access is needed to scan.
              </Text>
              <Pressable
                onPress={requestPermission}
                style={[styles.grantButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 6 }]}
              >
                <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>Allow Camera</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{hint}</Text>
              <View style={[styles.cameraWrap, { borderRadius: theme.style.cardRadius }]}>
                {visible && (
                  <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    cameraType={CameraType.Back}
                    scanBarcode
                    allowedBarcodeTypes={types}
                    onReadCode={handleReadCode}
                    torchMode={torchOn ? 'on' : 'off'}
                    zoomMode="on"
                    zoom={zoom}
                    maxZoom={5}
                  />
                )}

                {/* No guide is shown until something is actually detected -
                    camera-kit doesn't report a code's on-screen position, so
                    rather than show a misleading always-on box, we only flash
                    a shape-correct indicator (square for QR, wide for
                    barcodes) centered on screen the instant a code is read. */}
                {detected && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      shape === 'square' ? styles.squareIndicator : styles.wideIndicator,
                      {
                        opacity: pulse,
                        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
                      },
                    ]}
                  />
                )}

                <Pressable
                  onPress={toggleTorch}
                  style={[styles.torchBtn, { backgroundColor: torchOn ? theme.colors.accent : 'rgba(0,0,0,0.5)' }]}
                >
                  <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={20} color={torchOn ? theme.colors.onAccent : '#fff'} />
                </Pressable>

                <View style={styles.zoomRow}>
                  {ZOOM_PRESETS.map((z) => (
                    <Pressable
                      key={z}
                      onPress={() => selectZoom(z)}
                      style={[
                        styles.zoomChip,
                        { backgroundColor: Math.round(zoom) === z ? theme.colors.accent : 'rgba(0,0,0,0.5)' },
                      ]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: Math.round(zoom) === z ? theme.colors.onAccent : '#fff' }}>
                        {z}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 60, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 17, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 20, alignItems: 'center' },
  hint: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  cameraWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden' },
  squareIndicator: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    right: '20%',
    bottom: '30%',
    borderWidth: 3,
    borderColor: GREEN,
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderRadius: 20,
  },
  wideIndicator: {
    position: 'absolute',
    top: '42%',
    left: '10%',
    right: '10%',
    bottom: '42%',
    borderWidth: 3,
    borderColor: GREEN,
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderRadius: 12,
  },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  permissionText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
  grantButton: { paddingHorizontal: 20, paddingVertical: 12 },
  torchBtn: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  zoomRow: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 8 },
  zoomChip: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
})
