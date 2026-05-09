import { useState, useEffect, FormEvent } from 'react'
import { LogOut, Save, Loader2, Target, Flame, Mail, Lock, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../contexts/AuthContext'
import { calculateMacroTargets } from '../lib/macroCalc'
import { Profile as ProfileType } from '../types'

const GOALS = [
  { value: 'lose', label: 'Lose Weight', emoji: '📉', desc: '-500 kcal deficit' },
  { value: 'maintain', label: 'Maintain', emoji: '⚖️', desc: 'Stay at current weight' },
  { value: 'gain', label: 'Gain Weight', emoji: '📈', desc: '+300 kcal surplus' },
]

const ACTIVITY = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little/no exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Hard training daily' },
]

export default function Profile() {
  const { profile, loading, updateProfile } = useProfile()
  const { user, signOut } = useAuth()
  const [form, setForm] = useState<Partial<ProfileType>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setForm(profile)
  }, [profile])

  function set<K extends keyof ProfileType>(key: K, value: ProfileType[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await updateProfile(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const targets = profile ? calculateMacroTargets({ ...profile, ...form } as ProfileType) : null

  if (loading) {
    return (
      <Layout title="Profile">
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Profile">
      <form onSubmit={handleSave} className="space-y-5">
        {/* Name & basics */}
        <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-400">Personal Info</p>
          <input
            type="text"
            placeholder="Your name"
            value={form.name || ''}
            onChange={(e) => set('name', e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Height (cm)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="175"
                value={form.height_cm || ''}
                onChange={(e) => set('height_cm', parseFloat(e.target.value) || null as unknown as number)}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Birth Year</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="1990"
                value={form.birth_year || ''}
                onChange={(e) => set('birth_year', parseInt(e.target.value) || null as unknown as number)}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Current Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="75"
              value={form.current_weight_kg || ''}
              onChange={(e) => set('current_weight_kg', parseFloat(e.target.value) || null as unknown as number)}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'other'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('gender', g)}
                  className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                    form.gender === g ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Goal */}
        <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-400">Goal</p>
          <div className="space-y-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => set('goal', g.value as ProfileType['goal'])}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-left ${
                  form.goal === g.value ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <span className="text-2xl">{g.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{g.label}</p>
                  <p className="text-xs text-gray-500">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-400">Activity Level</p>
          <div className="space-y-2">
            {ACTIVITY.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => set('activity_level', a.value as ProfileType['activity_level'])}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                  form.activity_level === a.value ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <p className="text-sm font-semibold text-white">{a.label}</p>
                <p className="text-xs text-gray-500">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Calculated targets */}
        {targets && (
          <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-emerald-400" />
              <p className="text-sm font-semibold text-gray-400">Your Daily Targets</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Flame size={14} className="text-emerald-400" />
                  <p className="text-xl font-bold text-emerald-400">{targets.calories}</p>
                </div>
                <p className="text-xs text-gray-500">Calories</p>
              </div>
              <div className="bg-gray-800 rounded-2xl p-3 text-center">
                <p className="text-xl font-bold text-blue-400">{targets.protein_g}g</p>
                <p className="text-xs text-gray-500">Protein</p>
              </div>
              <div className="bg-gray-800 rounded-2xl p-3 text-center">
                <p className="text-xl font-bold text-amber-400">{targets.carbs_g}g</p>
                <p className="text-xs text-gray-500">Carbs</p>
              </div>
              <div className="bg-gray-800 rounded-2xl p-3 text-center">
                <p className="text-xl font-bold text-rose-400">{targets.fat_g}g</p>
                <p className="text-xs text-gray-500">Fat</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saved ? 'Saved!' : 'Save Profile'}
        </button>

        {/* Account / Security */}
        <SecuritySection email={user?.email ?? ''} onSignOut={signOut} />
      </form>
    </Layout>
  )
}

function SecuritySection({ email, onSignOut }: Readonly<{ email: string; onSignOut: () => void }>) {
  const [newEmail, setNewEmail] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [pwStatus, setPwStatus] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  async function handleEmailUpdate(e: FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailStatus(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailLoading(false)
    setEmailStatus(error ? error.message : 'Confirmation sent to new email address.')
    if (!error) setNewEmail('')
  }

  async function handlePasswordUpdate(e: FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwStatus('Passwords do not match.'); return }
    if (newPw.length < 8) { setPwStatus('Password must be at least 8 characters.'); return }
    setPwLoading(true)
    setPwStatus(null)
    // Re-authenticate first so the update is secure
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (signInError) { setPwLoading(false); setPwStatus('Current password is incorrect.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    setPwStatus(error ? error.message : 'Password updated successfully.')
    if (!error) { setCurrentPw(''); setNewPw(''); setConfirmPw('') }
  }

  return (
    <div className="space-y-4">
      {/* Update email */}
      <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-400">Update Email</p>
        </div>
        <p className="text-xs text-gray-600">Current: {email}</p>
        <form onSubmit={handleEmailUpdate} className="space-y-2">
          <input
            type="email"
            placeholder="New email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          {emailStatus && (
            <p className={`text-xs px-1 ${emailStatus.includes('sent') || emailStatus.includes('successfully') ? 'text-emerald-400' : 'text-red-400'}`}>
              {emailStatus}
            </p>
          )}
          <button
            type="submit"
            disabled={emailLoading || !newEmail.trim()}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-medium rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {emailLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Update Email
          </button>
        </form>
      </div>

      {/* Update password */}
      <div className="bg-gray-900 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-400">Change Password</p>
        </div>
        <form onSubmit={handlePasswordUpdate} className="space-y-2">
          <input
            type="password"
            placeholder="Current password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <input
            type="password"
            placeholder="New password (8+ chars)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 transition-colors ${
              confirmPw && confirmPw !== newPw ? 'ring-2 ring-red-500/50' : 'focus:ring-emerald-500/50'
            }`}
          />
          {pwStatus && (
            <p className={`text-xs px-1 ${pwStatus.includes('successfully') ? 'text-emerald-400' : 'text-red-400'}`}>
              {pwStatus}
            </p>
          )}
          <button
            type="submit"
            disabled={pwLoading || !currentPw || !newPw || newPw !== confirmPw}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-medium rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Update Password
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="bg-gray-900 rounded-3xl p-4">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-2 text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
