import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Flame, QrCode, ScanLine, X, Loader2, Pencil } from 'lucide-react'
import Layout from '../components/Layout'
import FoodSearchModal from '../components/FoodSearchModal'
import AddAmountModal from '../components/AddAmountModal'
import ExerciseModal from '../components/ExerciseModal'
import LogQRModal from '../components/LogQRModal'
import LogQRScannerModal from '../components/LogQRScannerModal'
import EditFoodLogModal from '../components/EditFoodLogModal'
import { useFoodLog } from '../hooks/useFoodLog'
import { useExerciseLog } from '../hooks/useExerciseLog'
import { FoodItem, Meal, MealType, FoodLog as FoodLogEntry } from '../types'
import { calcMacrosFromAmount } from '../lib/macroCalc'
import { LogQRData, logEntryMealType } from '../lib/logQR'

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function FoodLog() {
  const [searchParams] = useSearchParams()
  const todayStr = new Date().toISOString().split('T')[0]
  const dateStr = searchParams.get('date') || todayStr
  const initialMeal = (searchParams.get('meal') as MealType) || null

  const { logs, byMeal, addFoodLog, updateFoodLog, deleteFoodLog } = useFoodLog(dateStr)
  const { logs: exerciseLogs, totalBurned, addExerciseLog, deleteExerciseLog } = useExerciseLog(dateStr)

  const [activeMeal, setActiveMeal] = useState<MealType | null>(initialMeal)
  const [showSearch, setShowSearch] = useState(!!initialMeal)
  const [showExercise, setShowExercise] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [pendingMeal, setPendingMeal] = useState<MealType | null>(initialMeal)

  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null)
  const [showLogQR, setShowLogQR] = useState(false)
  const [showLogScanner, setShowLogScanner] = useState(false)
  const [importingLog, setImportingLog] = useState<LogQRData | null>(null)
  const [importSaving, setImportSaving] = useState(false)

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

  function handleAddClick(meal: MealType) {
    setActiveMeal(meal)
    setPendingMeal(meal)
    setSelectedFood(null)
    setShowSearch(true)
  }

  function handleFoodSelect(food: FoodItem) {
    setSelectedFood(food)
    setShowSearch(false)
  }

  async function handleMealSelect(meal: Meal) {
    if (!meal.ingredients || !pendingMeal) return
    setShowSearch(false)
    for (const ing of meal.ingredients) {
      await addFoodLog({
        logged_at: dateStr,
        meal_type: pendingMeal,
        food_name: ing.food_name,
        barcode: ing.barcode,
        amount_g: ing.amount_g,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
        fiber_g: ing.fiber_g,
        sugar_g: 0,
      })
    }
  }

  async function handleAmountConfirm(amount: number) {
    if (!selectedFood || !pendingMeal) return
    const macros = calcMacrosFromAmount(selectedFood, amount)
    await addFoodLog({
      logged_at: dateStr,
      meal_type: pendingMeal,
      food_name: selectedFood.name,
      barcode: selectedFood.barcode,
      amount_g: amount,
      ...macros,
    })
    setSelectedFood(null)
    setPendingMeal(null)
  }

  function handleLogScan(data: LogQRData) {
    setShowLogScanner(false)
    setImportingLog(data)
  }

  async function handleImportLog() {
    if (!importingLog) return
    setImportSaving(true)
    for (const entry of importingLog.e) {
      await addFoodLog({
        logged_at: dateStr,
        meal_type: logEntryMealType(entry),
        food_name: entry.n,
        amount_g: entry.a,
        calories: entry.c,
        protein_g: entry.p,
        carbs_g: entry.cb,
        fat_g: entry.f,
        fiber_g: entry.fi,
        sugar_g: 0,
      })
    }
    setImportSaving(false)
    setImportingLog(null)
  }

  const totalCals = logs.reduce((s, l) => s + l.calories, 0)
  const netCals = totalCals - totalBurned

  const logHeaderRight = (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setShowLogScanner(true)}
        className="flex items-center gap-1 bg-gray-800 text-gray-400 rounded-xl px-2.5 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors"
        aria-label="Scan a log"
      >
        <ScanLine size={14} />
        Scan
      </button>
      <button
        onClick={() => setShowLogQR(true)}
        className="flex items-center gap-1 bg-gray-800 text-gray-400 rounded-xl px-2.5 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors"
        aria-label="Share log"
      >
        <QrCode size={14} />
        Share
      </button>
    </div>
  )

  return (
    <>
      <Layout title={dateStr === todayStr ? "Today's Log" : dateStr} headerRight={logHeaderRight}>
        {/* Daily summary bar */}
        <div className="mb-4 bg-gray-900 rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-xs text-gray-500">Eaten</p>
              <p className="text-base font-bold text-white">{Math.round(totalCals)}</p>
            </div>
            {totalBurned > 0 && (
              <>
                <span className="text-gray-700 text-lg">−</span>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Burned</p>
                  <p className="text-base font-bold text-orange-400">{Math.round(totalBurned)}</p>
                </div>
                <span className="text-gray-700 text-lg">=</span>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Net</p>
                  <p className="text-base font-bold text-emerald-400">{Math.round(netCals)}</p>
                </div>
              </>
            )}
            {totalBurned === 0 && (
              <p className="text-xs text-gray-600">kcal</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Meal sections */}
          {mealTypes.map((meal) => {
            const items = byMeal(meal)
            const mealCals = items.reduce((s, i) => s + i.calories, 0)
            const mealProt = items.reduce((s, i) => s + i.protein_g, 0)

            return (
              <div key={meal} className="bg-gray-900 rounded-3xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => setActiveMeal(activeMeal === meal ? null : meal)}
                  >
                    <span className="text-xl">{MEAL_ICONS[meal]}</span>
                    <div>
                      <p className="text-sm font-semibold text-white capitalize">{meal}</p>
                      {items.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {Math.round(mealCals)} kcal · {Math.round(mealProt)}g protein
                        </p>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddClick(meal)}
                    className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {items.length > 0 && (
                  <div className="border-t border-gray-800">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.food_name}</p>
                          <p className="text-xs text-gray-500">{item.amount_g}g</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{Math.round(item.calories)}</p>
                            <div className="flex gap-1.5 justify-end">
                              <span className="text-[10px] text-blue-400">P{item.protein_g}g</span>
                              <span className="text-[10px] text-amber-400">C{item.carbs_g}g</span>
                              <span className="text-[10px] text-rose-400">F{item.fat_g}g</span>
                            </div>
                          </div>
                          <button onClick={() => setEditingEntry(item)} className="p-1.5 text-gray-600 hover:text-emerald-400 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deleteFoodLog(item.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Exercise section */}
          <div className="bg-gray-900 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-sm font-semibold text-white">Exercise</p>
                  {totalBurned > 0 && (
                    <p className="text-xs text-orange-400">{Math.round(totalBurned)} kcal burned</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowExercise(true)}
                className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-orange-500/20 transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {exerciseLogs.length > 0 && (
              <div className="border-t border-gray-800">
                {exerciseLogs.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{ex.name}</p>
                      {ex.duration_min && <p className="text-xs text-gray-500">{ex.duration_min} min</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Flame size={13} className="text-orange-400" />
                        <p className="text-sm font-semibold text-orange-400">{Math.round(ex.calories_burned)}</p>
                      </div>
                      <button onClick={() => deleteExerciseLog(ex.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>

      {showSearch && (
        <FoodSearchModal
          onSelect={handleFoodSelect}
          onClose={() => { setShowSearch(false); setActiveMeal(null) }}
          onSelectMeal={handleMealSelect}
        />
      )}

      {selectedFood && pendingMeal && (
        <AddAmountModal
          food={selectedFood}
          onConfirm={handleAmountConfirm}
          onBack={() => { setSelectedFood(null); setShowSearch(true) }}
        />
      )}

      {showExercise && (
        <ExerciseModal
          onAdd={async (entry) => { await addExerciseLog({ ...entry, logged_at: dateStr }) }}
          onClose={() => setShowExercise(false)}
        />
      )}

      {editingEntry && (
        <EditFoodLogModal
          entry={editingEntry}
          onSave={async (updates) => { await updateFoodLog(editingEntry.id, updates) }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {showLogQR && (
        <LogQRModal logs={logs} date={dateStr} onClose={() => setShowLogQR(false)} />
      )}

      {showLogScanner && (
        <LogQRScannerModal onScan={handleLogScan} onClose={() => setShowLogScanner(false)} />
      )}

      {/* Import log dialog */}
      {importingLog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl px-5 pt-5 pb-10 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">Import Log</h2>
                <p className="text-xs text-gray-500 mt-0.5">From {importingLog.d}</p>
              </div>
              <button
                onClick={() => setImportingLog(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mt) => {
                const entries = importingLog.e.filter((e) => logEntryMealType(e) === mt)
                if (entries.length === 0) return null
                return (
                  <div key={mt}>
                    <p className="text-xs text-gray-500 px-1 py-1 capitalize">{MEAL_ICONS[mt]} {mt}</p>
                    {entries.map((entry) => (
                      <div key={`${entry.n}-${entry.a}`} className="flex justify-between items-center bg-gray-800 rounded-xl px-3 py-2.5 mb-1">
                        <div>
                          <p className="text-sm text-white">{entry.n}</p>
                          <p className="text-xs text-gray-500">{entry.a}g</p>
                        </div>
                        <span className="text-xs text-gray-400">{entry.c} kcal</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            <div className="shrink-0 space-y-2 pt-1">
              <p className="text-xs text-gray-500 text-center">
                Will be added to <span className="text-white">{dateStr === todayStr ? 'today' : dateStr}</span>
              </p>
              <button
                onClick={handleImportLog}
                disabled={importSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {importSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                Add to My Log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
