import { useState } from 'react'
import { X, Search, Flame, Loader2 } from 'lucide-react'
import { searchExercises, calcCaloriesBurned, EXERCISE_CATEGORIES, Exercise } from '../lib/exercises'
import { useProfile } from '../hooks/useProfile'

interface ExerciseModalProps {
  onAdd: (entry: { name: string; duration_min?: number; calories_burned: number }) => Promise<void>
  onClose: () => void
}

export default function ExerciseModal({ onAdd, onClose }: Readonly<ExerciseModalProps>) {
  const { profile } = useProfile()
  const weight = profile?.current_weight_kg ?? 70

  const [tab, setTab] = useState<'search' | 'manual'>('search')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [duration, setDuration] = useState('30')
  const [manualName, setManualName] = useState('')
  const [manualCals, setManualCals] = useState('')
  const [manualDuration, setManualDuration] = useState('')
  const [saving, setSaving] = useState(false)

  const results = searchExercises(query).filter((e) => !category || e.category === category)
  const durationNum = Number.parseInt(duration) || 0
  const estimatedCals = selected ? calcCaloriesBurned(selected.met, weight, durationNum) : 0

  const quickDurations = [15, 20, 30, 45, 60, 90]

  async function handleAddSearch() {
    if (!selected || durationNum <= 0) return
    setSaving(true)
    await onAdd({ name: selected.name, duration_min: durationNum, calories_burned: estimatedCals })
    setSaving(false)
    onClose()
  }

  async function handleAddManual() {
    const cals = Number.parseFloat(manualCals)
    if (!manualName.trim() || cals <= 0) return
    setSaving(true)
    await onAdd({
      name: manualName.trim(),
      duration_min: Number.parseInt(manualDuration) || undefined,
      calories_burned: cals,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Log Exercise</h2>
        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4">
        {(['search', 'manual'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500'
            }`}
          >
            {t === 'search' ? 'Find Exercise' : 'Manual Entry'}
          </button>
        ))}
      </div>

      {tab === 'search' ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {!selected ? (
            <>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 bg-gray-800 rounded-2xl px-4 py-3">
                  <Search size={16} className="text-gray-500 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search exercises..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setCategory(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      !category ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    All
                  </button>
                  {EXERCISE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(category === cat ? null : cat)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        category === cat ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
                {results.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => setSelected(ex)}
                    className="w-full text-left bg-gray-900 rounded-2xl px-4 py-3 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{ex.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ex.category}</p>
                      </div>
                      <p className="text-xs text-orange-400 font-semibold">
                        ~{calcCaloriesBurned(ex.met, weight, 30)} kcal/30min
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                ← Back to list
              </button>

              <div className="bg-gray-900 rounded-2xl p-4">
                <p className="font-semibold text-white">{selected.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selected.category} · MET {selected.met}</p>
              </div>

              <div className="space-y-3">
                <label htmlFor="duration-input" className="text-sm font-medium text-gray-400">Duration (minutes)</label>
                <div className="flex items-center bg-gray-800 rounded-2xl overflow-hidden">
                  <input
                    id="duration-input"
                    type="number"
                    inputMode="numeric"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-4 text-2xl font-bold text-white outline-none text-center"
                    min="1"
                  />
                  <span className="pr-4 text-gray-500 text-sm font-medium">min</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {quickDurations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(String(d))}
                      className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                        durationNum === d ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {durationNum > 0 && (
                <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame size={20} className="text-orange-400" />
                    <div>
                      <p className="text-xs text-gray-500">Est. calories burned</p>
                      <p className="text-xs text-gray-600">Based on {weight}kg body weight</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-orange-400">{estimatedCals}</p>
                </div>
              )}

              <button
                onClick={handleAddSearch}
                disabled={saving || durationNum <= 0}
                className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Log {estimatedCals} kcal burned
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 p-4 space-y-4">
          <p className="text-xs text-gray-500">Enter exactly what your fitness tracker or app recorded.</p>
          <input
            type="text"
            placeholder="Exercise name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-cals" className="text-xs text-gray-500 mb-1 block">Calories burned *</label>
              <input
                id="manual-cals"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 350"
                value={manualCals}
                onChange={(e) => setManualCals(e.target.value)}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            <div>
              <label htmlFor="manual-duration" className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
              <input
                id="manual-duration"
                type="number"
                inputMode="numeric"
                placeholder="optional"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>
          <button
            onClick={handleAddManual}
            disabled={saving || !manualName.trim() || !manualCals}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Log Exercise
          </button>
        </div>
      )}
    </div>
  )
}
