import { X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Meal } from '../types'
import { encodeMealToQR } from '../lib/mealQR'

interface MealQRModalProps {
  meal: Meal
  onClose: () => void
}

export default function MealQRModal({ meal, onClose }: Readonly<MealQRModalProps>) {
  const qrValue = encodeMealToQR(meal)
  const totals = (meal.ingredients ?? []).reduce(
    (acc, i) => ({ cal: acc.cal + i.calories, p: acc.p + i.protein_g, c: acc.c + i.carbs_g, f: acc.f + i.fat_g }),
    { cal: 0, p: 0, c: 0, f: 0 }
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 rounded-t-3xl px-6 pt-5 pb-10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Share Meal</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG value={qrValue} size={220} level="M" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-white font-semibold text-base">{meal.name}</p>
            <div className="flex gap-3 justify-center">
              <span className="text-xs text-emerald-400 font-semibold">{Math.round(totals.cal)} kcal</span>
              <span className="text-xs text-blue-400">P {Math.round(totals.p)}g</span>
              <span className="text-xs text-amber-400">C {Math.round(totals.c)}g</span>
              <span className="text-xs text-rose-400">F {Math.round(totals.f)}g</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ask your friend to scan this with MacroTrack
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
