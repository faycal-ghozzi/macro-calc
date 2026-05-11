import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { MealQRData, decodeMealFromQR } from '../lib/mealQR'

interface QRScannerModalProps {
  onScan: (data: MealQRData) => void
  onClose: () => void
}

export default function QRScannerModal({ onScan, onClose }: Readonly<QRScannerModalProps>) {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const scannerRef = useRef<unknown>(null)
  const mountedRef = useRef(false)
  const firedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    let scanner: {
      render: (onSuccess: (text: string) => void, onError: (err: unknown) => void) => void
      clear: () => Promise<void>
    } | null = null

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode')
        scanner = new Html5QrcodeScanner(
          'qr-meal-scanner-element',
          {
            fps: 15,
            qrbox: { width: 280, height: 280 },
            supportedScanTypes: [0],
            showTorchButtonIfSupported: true,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          false
        ) as typeof scanner

        scannerRef.current = scanner
        if (!scanner) return

        scanner.render(
          (decodedText) => {
            if (firedRef.current) return
            const data = decodeMealFromQR(decodedText)
            if (data) {
              firedRef.current = true
              onScan(data)
            } else {
              setStatus('QR code not recognized as a MacroTrack meal')
            }
          },
          () => {
            // silently ignore frame errors
          }
        )
      } catch (e) {
        setError('Camera not available.')
        console.error(e)
      }
    }

    startScanner()

    return () => {
      if (scanner) scanner.clear().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Scan Meal QR</h2>
        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {error ? (
          <div className="text-center text-red-400 text-sm px-4">{error}</div>
        ) : (
          <div className="w-full max-w-sm">
            <p className="text-sm text-gray-400 text-center mb-4">
              Point camera at a MacroTrack meal QR code
            </p>
            <div id="qr-meal-scanner-element" className="rounded-2xl overflow-hidden [&_video]:rounded-2xl" />
          </div>
        )}
        {status && (
          <p className="text-xs text-amber-400 text-center px-4">{status}</p>
        )}
      </div>
    </div>
  )
}
