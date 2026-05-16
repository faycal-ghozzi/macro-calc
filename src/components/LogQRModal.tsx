import { X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { FoodLog } from '../types'
import { encodeLogToQR } from '../lib/logQR'

interface LogQRModalProps {
  logs: FoodLog[]
  date: string
  onClose: () => void
}

export default function LogQRModal({ logs, date, onClose }: Readonly<LogQRModalProps>) {
  const qrValue = encodeLogToQR(logs, date)
  const total = logs.reduce((s, l) => s + l.calories, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 rounded-t-3xl px-6 pt-5 pb-10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Share Daily Log</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm py-8">No food logged today to share.</p>
          ) : (
            <>
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={qrValue} size={220} level="L" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-semibold">{date}</p>
                <p className="text-sm text-gray-400">
                  {logs.length} item{logs.length === 1 ? '' : 's'} · {Math.round(total)} kcal
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Ask them to tap Scan on their Log page
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
