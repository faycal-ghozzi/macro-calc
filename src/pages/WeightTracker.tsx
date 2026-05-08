import { useState } from 'react'
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Layout from '../components/Layout'
import { useWeightLog } from '../hooks/useWeightLog'

export default function WeightTracker() {
  const { entries, loading, addEntry, deleteEntry, latestEntry, totalChange } = useWeightLog()
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleAdd() {
    const kg = parseFloat(weight)
    if (!kg || kg < 20 || kg > 500) return
    setSaving(true)
    await addEntry(kg, date, notes || undefined)
    setSaving(false)
    setWeight('')
    setNotes('')
    setShowForm(false)
  }

  const chartData = entries.map((e) => ({
    date: e.logged_at.slice(5), // MM-DD
    weight: e.weight_kg,
    fullDate: e.logged_at,
  }))

  const minWeight = entries.length > 0 ? Math.min(...entries.map((e) => e.weight_kg)) - 2 : 0
  const maxWeight = entries.length > 0 ? Math.max(...entries.map((e) => e.weight_kg)) + 2 : 100

  const TrendIcon = totalChange < -0.1 ? TrendingDown : totalChange > 0.1 ? TrendingUp : Minus
  const trendColor = totalChange < -0.1 ? '#10b981' : totalChange > 0.1 ? '#f43f5e' : '#6b7280'

  return (
    <Layout
      title="Weight Tracker"
      headerRight={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-medium"
        >
          <Plus size={14} />
          Log
        </button>
      }
    >
      {/* Stats row */}
      {latestEntry && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{latestEntry.weight_kg}</p>
            <p className="text-xs text-gray-500 mt-0.5">Current (kg)</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendIcon size={16} style={{ color: trendColor }} />
              <p className="text-2xl font-bold" style={{ color: trendColor }}>
                {Math.abs(totalChange).toFixed(1)}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Total change</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{entries.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Entries</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-900 rounded-3xl p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Log Weight</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="Weight (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="bg-gray-800 rounded-xl px-3 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !weight}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Save Entry
          </button>
        </div>
      )}

      {/* Chart */}
      {entries.length >= 2 ? (
        <div className="bg-gray-900 rounded-3xl p-4 mb-4">
          <p className="text-sm font-semibold text-white mb-4">Weight History</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[minWeight, maxWeight]}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#10b981' }}
                formatter={(value: number) => [`${value} kg`, 'Weight']}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* History list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <TrendingUp size={40} className="text-gray-700 mx-auto" />
          <p className="text-gray-500 text-sm">No weight entries yet</p>
          <button onClick={() => setShowForm(true)} className="text-emerald-400 text-sm font-medium">
            Log your first weight
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-400 px-1">History</p>
          {[...entries].reverse().map((entry, i) => {
            const prev = entries[entries.length - 1 - i - 1]
            const diff = prev ? entry.weight_kg - prev.weight_kg : null

            return (
              <div key={entry.id} className="flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{entry.weight_kg} kg</p>
                  <p className="text-xs text-gray-500">{entry.logged_at}</p>
                  {entry.notes && <p className="text-xs text-gray-600 mt-0.5">{entry.notes}</p>}
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
    </Layout>
  )
}
