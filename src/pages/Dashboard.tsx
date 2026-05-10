import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Flame, Target } from 'lucide-react'
import Layout from '../components/Layout'
import { MacroRing, MacroBar } from '../components/MacroRing'
import { useFoodLog } from '../hooks/useFoodLog'
import { useExerciseLog } from '../hooks/useExerciseLog'
import { useProfile } from '../hooks/useProfile'
import { calculateMacroTargets } from '../lib/macroCalc'

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function displayDate(date: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (formatDate(date) === formatDate(today)) return 'Today'
  if (formatDate(date) === formatDate(yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const [date, setDate] = useState(new Date())
  const dateStr = formatDate(date)
  const { totals, byMeal } = useFoodLog(dateStr)
  const { totalBurned } = useExerciseLog(dateStr)
  const { profile } = useProfile()
  const targets = profile ? calculateMacroTargets(profile) : null
  const isToday = formatDate(date) === formatDate(new Date())

  function changeDate(delta: number) {
    const next = new Date(date)
    next.setDate(date.getDate() + delta)
    if (next > new Date()) return
    setDate(next)
  }

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const
  const netCalories = totals.calories - totalBurned
  const caloriesLeft = targets ? targets.calories - netCalories : null

  return (
    <Layout
      title="MacroTrack"
      headerRight={
        <Link to="/profile" className="text-xs text-emerald-400 font-medium">
          {profile?.name || 'Set up profile'}
        </Link>
      }
    >
      {/* Date nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-white">{displayDate(date)}</span>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calorie summary */}
      <div className="bg-gray-900 rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-xs font-medium">Net Calories</p>
            <p className="text-3xl font-bold text-white mt-0.5">{Math.round(netCalories)}</p>
            {targets && (
              <p className="text-xs mt-1 font-medium flex items-center gap-1">
                {caloriesLeft! >= 0 ? (
                  <><Target size={11} className="text-emerald-400" /><span className="text-emerald-400">{Math.round(caloriesLeft!)} remaining</span></>
                ) : (
                  <><Flame size={11} className="text-red-400" /><span className="text-red-400">{Math.abs(Math.round(caloriesLeft!))} over</span></>
                )}
              </p>
            )}
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-xs text-gray-500">Eaten</p>
              <p className="text-lg font-bold text-white">{Math.round(totals.calories)}</p>
            </div>
            {totalBurned > 0 && (
              <div>
                <p className="text-xs text-gray-500">Burned</p>
                <p className="text-lg font-bold text-orange-400">−{Math.round(totalBurned)}</p>
              </div>
            )}
            {targets && (
              <div>
                <p className="text-xs text-gray-600">target {targets.calories}</p>
              </div>
            )}
          </div>
        </div>

        {targets && (
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((netCalories / targets.calories) * 100, 100)}%`,
                backgroundColor: netCalories > targets.calories ? '#ef4444' : '#10b981',
              }}
            />
          </div>
        )}
      </div>

      {/* Macro rings */}
      {targets ? (
        <div className="bg-gray-900 rounded-3xl p-5 mb-4">
          <div className="flex justify-around">
            <MacroRing label="Protein" current={totals.protein_g} target={targets.protein_g} color="#60a5fa" />
            <MacroRing label="Carbs" current={totals.carbs_g} target={targets.carbs_g} color="#fbbf24" />
            <MacroRing label="Fat" current={totals.fat_g} target={targets.fat_g} color="#f43f5e" />
            {totals.fiber_g > 0 && (
              <MacroRing label="Fiber" current={totals.fiber_g} target={25} color="#a78bfa" />
            )}
          </div>
        </div>
      ) : (
        <Link
          to="/profile"
          className="block bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 mb-4 text-center"
        >
          <p className="text-emerald-400 text-sm font-medium">Complete your profile to see macro targets →</p>
        </Link>
      )}

      {/* Macro bars */}
      {targets && (
        <div className="bg-gray-900 rounded-3xl p-5 mb-4 space-y-3">
          <MacroBar label="Protein" current={totals.protein_g} target={targets.protein_g} color="#60a5fa" />
          <MacroBar label="Carbs" current={totals.carbs_g} target={targets.carbs_g} color="#fbbf24" />
          <MacroBar label="Fat" current={totals.fat_g} target={targets.fat_g} color="#f43f5e" />
        </div>
      )}

      {/* Meal summary */}
      <div className="space-y-2 mb-4">
        {mealTypes.map((meal) => {
          const items = byMeal(meal)
          const mealCals = items.reduce((s, i) => s + i.calories, 0)
          return (
            <Link
              key={meal}
              to={`/log?meal=${meal}&date=${dateStr}`}
              className="flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-white capitalize">{meal}</p>
                <p className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-emerald-400">{Math.round(mealCals)} kcal</p>
                <Plus size={16} className="text-gray-600" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick add */}
      <Link
        to={`/log?date=${dateStr}`}
        className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-2xl py-4 transition-colors"
      >
        <Plus size={20} />
        Add Food
      </Link>
    </Layout>
  )
}
