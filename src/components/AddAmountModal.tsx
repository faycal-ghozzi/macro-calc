import { useState } from 'react'
import { X, ChevronRight, Heart } from 'lucide-react'
import { FoodItem, MeasurementUnit } from '../types'
import { calcMacrosFromAmount, convertToGrams } from '../lib/macroCalc'
import { useFavorites } from '../hooks/useFavorites'

interface AddAmountModalProps {
  food: FoodItem
  onConfirm: (amount_g: number) => void
  onBack: () => void
}

type UnitGroup = { label: string; units: { value: MeasurementUnit; label: string }[] }

function getUnitGroups(food: FoodItem): UnitGroup[] {
  const groups: UnitGroup[] = [
    { label: 'Weight', units: [{ value: 'g', label: 'g' }] },
    { label: 'Volume', units: [{ value: 'ml', label: 'ml' }, { value: 'cl', label: 'cl' }, { value: 'L', label: 'L' }] },
    { label: 'Spoon', units: [{ value: 'tbsp', label: 'tbsp' }, { value: 'tsp', label: 'tsp' }] },
  ]
  if (food.piece_weight_g) {
    groups.push({ label: 'Count', units: [{ value: 'piece', label: 'piece' }] })
  }
  return groups
}

const QUICK_AMOUNTS: Record<MeasurementUnit, number[]> = {
  g:     [50, 100, 150, 200, 250, 300],
  ml:    [50, 100, 150, 200, 250, 330],
  cl:    [5, 10, 15, 20, 25, 33],
  L:     [0.25, 0.33, 0.5, 0.75, 1, 1.5],
  tbsp:  [1, 2, 3, 4, 5, 6],
  tsp:   [1, 2, 3, 4, 5, 6],
  piece: [1, 2, 3, 4, 5, 6],
}

export default function AddAmountModal({ food, onConfirm, onBack }: Readonly<AddAmountModalProps>) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(food)
  const favColorClass = fav ? 'text-rose-400 hover:text-rose-300' : 'text-gray-500 hover:text-rose-400'
  const [unit, setUnit] = useState<MeasurementUnit>('g')
  const [amount, setAmount] = useState('100')

  const amountNum = Number.parseFloat(amount) || 0
  const amountInGrams = convertToGrams(amountNum, unit, food.piece_weight_g)
  const macros = calcMacrosFromAmount(food, amountInGrams)
  const unitGroups = getUnitGroups(food)

  function defaultAmountForUnit(newUnit: MeasurementUnit): string {
    if (newUnit === 'piece') return '1'
    if (newUnit === 'L') return '0.5'
    return '100'
  }

  function handleUnitChange(newUnit: MeasurementUnit) {
    setUnit(newUnit)
    setAmount(defaultAmountForUnit(newUnit))
  }

  function buildUnitLabel(): string {
    if (unit !== 'piece') return unit
    const plural = amountNum === 1 ? '' : 's'
    return `piece${plural} (≈${food.piece_weight_g}g each)`
  }

  const unitLabel = buildUnitLabel()

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={onBack} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-base font-semibold text-white">Set Amount</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Food info */}
        <div className="bg-gray-900 rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">{food.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">per 100g: {food.calories_100g} kcal</p>
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(food)}
            className={`p-1 transition-colors shrink-0 ${favColorClass}`}
            aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={20} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Unit selector */}
        <div className="space-y-2">
          <label htmlFor="unit-buttons" className="text-sm font-medium text-gray-400">Unit</label>
          <div className="space-y-2">
            {unitGroups.map((group) => (
              <div key={group.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-12 shrink-0">{group.label}</span>
                <div className="flex gap-2 flex-wrap">
                  {group.units.map((u) => (
                    <button
                      key={u.value}
                      onClick={() => handleUnitChange(u.value)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                        unit === u.value
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Amount input */}
        <div className="space-y-3">
          <label htmlFor="amount-input" className="text-sm font-medium text-gray-400">Amount</label>
          <div className="flex items-center bg-gray-800 rounded-2xl overflow-hidden">
            <input
              id="amount-input"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent px-4 py-4 text-2xl font-bold text-white outline-none text-center"
              min="0.1"
              step={unit === 'L' ? '0.1' : '1'}
            />
            <span className="pr-4 text-gray-500 font-medium text-sm">{unit}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS[unit].map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                  amountNum === a
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {a} {unit}
              </button>
            ))}
          </div>

          {unit === 'g' || amountInGrams <= 0 ? null : (
            <p className="text-xs text-gray-600 text-center">≈ {Math.round(amountInGrams)}g</p>
          )}
        </div>

        {/* Macro preview */}
        {amountInGrams > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-400">
              Nutritional Values for {amountNum} {unitLabel}
            </p>
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
            {food.fiber_100g != null && (
              <p className="text-xs text-gray-500 text-center">
                Fiber: {macros.fiber_g}g
                {food.sugar_100g == null ? '' : ` · Sugar: ${macros.sugar_g}g`}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => amountInGrams > 0 && onConfirm(amountInGrams)}
          disabled={amountInGrams <= 0}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
        >
          Add to Log
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
