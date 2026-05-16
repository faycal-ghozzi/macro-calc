import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { FoodLog } from '../types'

interface EditFoodLogModalProps {
  entry: FoodLog
  onSave: (updates: Partial<FoodLog>) => Promise<void>
  onClose: () => void
}

interface MacroFieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  color: string
  focusColor: string
}

function MacroField({ id, label, value, onChange, color, focusColor }: Readonly<MacroFieldProps>) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-gray-500">{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-gray-800 rounded-xl px-3 py-2.5 ${color} font-semibold text-sm outline-none focus:ring-2 ${focusColor}`}
      />
    </div>
  )
}

export default function EditFoodLogModal({ entry, onSave, onClose }: Readonly<EditFoodLogModalProps>) {
  const [name, setName] = useState(entry.food_name)
  const [amount, setAmount] = useState(String(entry.amount_g))
  const [calories, setCalories] = useState(String(entry.calories))
  const [protein, setProtein] = useState(String(entry.protein_g))
  const [carbs, setCarbs] = useState(String(entry.carbs_g))
  const [fat, setFat] = useState(String(entry.fat_g))
  const [fiber, setFiber] = useState(String(entry.fiber_g ?? 0))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      food_name: name.trim() || entry.food_name,
      amount_g: Number.parseFloat(amount) || entry.amount_g,
      calories: Number.parseFloat(calories) || 0,
      protein_g: Number.parseFloat(protein) || 0,
      carbs_g: Number.parseFloat(carbs) || 0,
      fat_g: Number.parseFloat(fat) || 0,
      fiber_g: Number.parseFloat(fiber) || 0,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-base font-semibold text-white">Edit Entry</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="edit-name" className="text-xs font-medium text-gray-400">Food name</label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-amount" className="text-xs font-medium text-gray-400">Amount (g)</label>
          <input
            id="edit-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400">Nutritional values</p>
          <div className="grid grid-cols-2 gap-3">
            <MacroField id="edit-calories" label="Calories (kcal)" value={calories} onChange={setCalories} color="text-emerald-400" focusColor="focus:ring-emerald-500/50" />
            <MacroField id="edit-protein"  label="Protein (g)"     value={protein}  onChange={setProtein}  color="text-blue-400"    focusColor="focus:ring-blue-500/50" />
            <MacroField id="edit-carbs"    label="Carbs (g)"       value={carbs}    onChange={setCarbs}    color="text-amber-400"   focusColor="focus:ring-amber-500/50" />
            <MacroField id="edit-fat"      label="Fat (g)"         value={fat}      onChange={setFat}      color="text-rose-400"    focusColor="focus:ring-rose-500/50" />
          </div>
          <MacroField id="edit-fiber" label="Fiber (g)" value={fiber} onChange={setFiber} color="text-gray-300" focusColor="focus:ring-gray-500/50" />
        </div>
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          Save Changes
        </button>
      </div>
    </div>
  )
}
