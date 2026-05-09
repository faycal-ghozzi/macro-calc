import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Readonly<BarcodeScannerProps>) {
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<unknown>(null)
  const mountedRef = useRef(false)

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
          'html5-qrcode-element',
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            supportedScanTypes: [0], // camera only (SCAN_TYPE_CAMERA = 0)
            rememberLastUsedCamera: true,
          },
          false
        ) as typeof scanner

        scannerRef.current = scanner

        scanner!.render(
          (decodedText) => {
            const digits = decodedText.replace(/\D/g, '')
            // Accept EAN-8 (8), UPC-E (8), UPC-A (12), EAN-13 (13)
            if (digits.length === 8 || digits.length === 12 || digits.length === 13) {
              onScan(digits)
            }
          },
          () => {
            // silently ignore frame errors
          }
        )
      } catch (e) {
        setError('Camera not available. Please enter barcode manually.')
        console.error(e)
      }
    }

    startScanner()

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Scan Barcode</h2>
        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center text-red-400 text-sm px-4">{error}</div>
        ) : (
          <div className="w-full max-w-sm">
            <p className="text-sm text-gray-400 text-center mb-4">
              Point camera at a product barcode
            </p>
            <div id="html5-qrcode-element" className="rounded-2xl overflow-hidden [&_video]:rounded-2xl" />
          </div>
        )}
      </div>
    </div>
  )
}
