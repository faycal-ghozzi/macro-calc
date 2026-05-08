import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { FoodItem } from '../types'
import { calcMacrosFromAmount } from '../lib/macroCalc'

interface AddAmountModalProps {
  food: FoodItem
  onConfirm: (amount: number) => void
  onBack: () => void
}

export default function AddAmountModal({ food, onConfirm, onBack }: AddAmountModalProps) {
  const [amount, setAmount] = useState('100')
  const amountNum = parseFloat(amount) || 0
  const macros = calcMacrosFromAmount(food, amountNum)

  const commonAmounts = [50, 100, 150, 200, 250, 300]

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={onBack} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-base font-semibold text-white">Set Amount</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Food info */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="font-semibold text-white">{food.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">per 100g: {food.calories_100g} kcal</p>
        </div>

        {/* Amount input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-400">Amount (grams / ml)</label>
          <div className="flex items-center bg-gray-800 rounded-2xl overflow-hidden">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent px-4 py-4 text-2xl font-bold text-white outline-none text-center"
              min="1"
            />
            <span className="pr-4 text-gray-500 font-medium">g</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {commonAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                  amountNum === a
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {a}g
              </button>
            ))}
          </div>
        </div>

        {/* Macro preview */}
        {amountNum > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-400">Nutritional Values</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">{macros.calories}</p>
                <p className="text-xs text-gray-500">Calories</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-400">{macros.protein_g}g</p>
                <p className="text-xs text-gray-500">Protein</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-amber-400">{macros.carbs_g}g</p>
                <p className="text-xs text-gray-500">Carbs</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-rose-400">{macros.fat_g}g</p>
                <p className="text-xs text-gray-500">Fat</p>
              </div>
            </div>
            {(food.fiber_100g != null) && (
              <p className="text-xs text-gray-500 text-center">
                Fiber: {macros.fiber_g}g
                {food.sugar_100g != null ? ` · Sugar: ${macros.sugar_g}g` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => amountNum > 0 && onConfirm(amountNum)}
          disabled={amountNum <= 0}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
        >
          Add to Log
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
