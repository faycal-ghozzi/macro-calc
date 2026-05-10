import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useWeightLog } from '../hooks/useWeightLog'
import { useReports } from '../hooks/useReports'
import { useProfile } from '../hooks/useProfile'
import { calculateMacroTargets } from '../lib/macroCalc'

type Tab = 'weight' | 'weekly' | 'monthly'

export default function Progress() {
  const [tab, setTab] = useState<Tab>('weekly')
  const { entries, loading: wLoading, addEntry, deleteEntry, latestEntry, totalChange } = useWeightLog()
  const { weekly, monthly, loading: rLoading } = useReports()
  const { profile } = useProfile()
  const targets = profile ? calculateMacroTargets(profile) : null

  const [weight, setWeight] = useState('')
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0])
  const [weightNotes, setWeightNotes] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [showWeightForm, setShowWeightForm] = useState(false)

  async function handleAddWeight() {
    const kg = Number.parseFloat(weight)
    if (!kg || kg < 20 || kg > 500) return
    setSavingWeight(true)
    await addEntry(kg, weightDate, weightNotes || undefined)
    setSavingWeight(false)
    setWeight('')
    setWeightNotes('')
    setShowWeightForm(false)
  }

  const TrendIcon = totalChange < -0.1 ? TrendingDown : totalChange > 0.1 ? TrendingUp : Minus
  const trendColor = totalChange < -0.1 ? '#10b981' : totalChange > 0.1 ? '#f43f5e' : '#6b7280'

  const weightChartData = entries.map((e) => ({ date: e.logged_at.slice(5), weight: e.weight_kg }))
  const minWeight = entries.length > 0 ? Math.min(...entries.map((e) => e.weight_kg)) - 2 : 0
  const maxWeight = entries.length > 0 ? Math.max(...entries.map((e) => e.weight_kg)) + 2 : 100

  const report = tab === 'weekly' ? weekly : monthly
  const calChartData = report?.days.map((d) => ({
    date: d.date.slice(5),
    Consumed: Math.round(d.calories),
    Burned: Math.round(d.calories_burned),
    Net: Math.round(d.net_calories),
  })) ?? []

  return (
    <Layout
      title="Progress"
      headerRight={
        tab === 'weight' ? (
          <button
            onClick={() => setShowWeightForm((v) => !v)}
            className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-medium"
          >
            <Plus size={14} />
            Log
          </button>
        ) : null
      }
    >
      {/* Tab bar */}
      <div className="flex bg-gray-900 rounded-2xl p-1 mb-5">
        {(['weekly', 'monthly', 'weight'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              tab === t ? 'bg-emerald-500 text-white' : 'text-gray-500'
            }`}
          >
            {t === 'weekly' ? '7 Days' : t === 'monthly' ? '30 Days' : 'Weight'}
          </button>
        ))}
      </div>

      {/* ── WEIGHT TAB ── */}
      {tab === 'weight' && (
        <div className="space-y-4">
          {latestEntry && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{latestEntry.weight_kg}</p>
                <p className="text-xs text-gray-500 mt-0.5">Current (kg)</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendIcon size={14} style={{ color: trendColor }} />
                  <p className="text-2xl font-bold" style={{ color: trendColor }}>
                    {Math.abs(totalChange).toFixed(1)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Total Δ</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{entries.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Entries</p>
              </div>
            </div>
          )}

          {showWeightForm && (
            <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
              <div className="flex gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="Weight (kg)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <input
                  type="date"
                  value={weightDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setWeightDate(e.target.value)}
                  className="bg-gray-800 rounded-xl px-3 py-3 text-white text-sm outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="Notes (optional)"
                value={weightNotes}
                onChange={(e) => setWeightNotes(e.target.value)}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                onClick={handleAddWeight}
                disabled={savingWeight || !weight}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {savingWeight && <Loader2 size={15} className="animate-spin" />}
                Save
              </button>
            </div>
          )}

          {entries.length >= 2 && (
            <div className="bg-gray-900 rounded-3xl p-4">
              <p className="text-sm font-semibold text-white mb-4">Weight History</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[minWeight, maxWeight]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#10b981' }} formatter={(v: number) => [`${v} kg`, 'Weight']} />
                  <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {wLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-emerald-400" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <TrendingUp size={36} className="text-gray-700 mx-auto" />
              <p className="text-gray-500 text-sm">No weight entries yet</p>
              <button onClick={() => setShowWeightForm(true)} className="text-emerald-400 text-sm font-medium">Log your first weight</button>
            </div>
          ) : (
            <div className="space-y-2">
              {[...entries].reverse().map((entry, i) => {
                const prev = entries[entries.length - 1 - i - 1]
                const diff = prev ? entry.weight_kg - prev.weight_kg : null
                return (
                  <div key={entry.id} className="flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.weight_kg} kg</p>
                      <p className="text-xs text-gray-500">{entry.logged_at}{entry.notes ? ` · ${entry.notes}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {diff !== null && (
                        <span className={`text-xs font-semibold ${diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                        </span>
                      )}
                      <button onClick={() => deleteEntry(entry.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── WEEKLY / MONTHLY TABS ── */}
      {(tab === 'weekly' || tab === 'monthly') && (
        <div className="space-y-4">
          {rLoading || !report ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Avg daily calories</p>
                  <p className="text-xl font-bold text-white">{report.avg_calories}</p>
                  {targets && <p className="text-xs text-gray-600 mt-0.5">target {targets.calories}</p>}
                </div>
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Avg net calories</p>
                  <p className="text-xl font-bold text-emerald-400">{report.avg_net_calories}</p>
                  <p className="text-xs text-gray-600 mt-0.5">after exercise</p>
                </div>
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Total burned</p>
                  <p className="text-xl font-bold text-orange-400">{report.total_burned} kcal</p>
                  <p className="text-xs text-gray-600 mt-0.5">{report.active_days} active days</p>
                </div>
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Avg protein</p>
                  <p className="text-xl font-bold text-blue-400">{report.avg_protein}g</p>
                  {targets && <p className="text-xs text-gray-600 mt-0.5">target {targets.protein_g}g</p>}
                </div>
              </div>

              {/* Calorie chart */}
              {calChartData.some((d) => d.Consumed > 0) && (
                <div className="bg-gray-900 rounded-3xl p-4">
                  <p className="text-sm font-semibold text-white mb-1">Daily Calories</p>
                  <div className="flex gap-3 mb-3">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Consumed</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Burned</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={calChartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, fontSize: 11 }} labelStyle={{ color: '#9ca3af' }} />
                      {targets && <ReferenceLine y={targets.calories} stroke="#374151" strokeDasharray="4 4" />}
                      <Bar dataKey="Consumed" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Burned" fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Macro averages */}
              <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
                <p className="text-sm font-semibold text-white">Avg Macros / day</p>
                {[
                  { label: 'Protein', val: report.avg_protein, target: targets?.protein_g, color: '#60a5fa' },
                  { label: 'Carbs', val: report.avg_carbs, target: targets?.carbs_g, color: '#fbbf24' },
                  { label: 'Fat', val: report.avg_fat, target: targets?.fat_g, color: '#f43f5e' },
                ].map(({ label, val, target, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-300">{val}g{target ? <span className="text-gray-600"> / {target}g</span> : null}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${target ? Math.min((val / target) * 100, 100) : 50}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Day-by-day list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 px-1">Day by day</p>
                {[...report.days].reverse().map((day) => (
                  <div key={day.date} className={`bg-gray-900 rounded-2xl px-4 py-3 ${day.calories === 0 ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{day.date}</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-emerald-400">{Math.round(day.calories)} in</span>
                        {day.calories_burned > 0 && <span className="text-orange-400">−{Math.round(day.calories_burned)} out</span>}
                        <span className="text-gray-400 font-semibold">{Math.round(day.net_calories)} net</span>
                      </div>
                    </div>
                    {day.calories > 0 && (
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] text-blue-400">P {Math.round(day.protein_g)}g</span>
                        <span className="text-[10px] text-amber-400">C {Math.round(day.carbs_g)}g</span>
                        <span className="text-[10px] text-rose-400">F {Math.round(day.fat_g)}g</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
