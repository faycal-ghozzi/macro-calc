import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Dumbbell } from 'lucide-react'

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage({ text: error.message, type: 'error' })
      else setMessage({ text: 'Check your email to confirm your account.', type: 'success' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ text: error.message, type: 'error' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl">
            <Dumbbell size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">MacroTrack</h1>
          <p className="text-gray-500 text-sm">Track your nutrition, reach your goals</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-gray-900 rounded-2xl p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === m ? 'bg-emerald-500 text-white shadow' : 'text-gray-500'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 transition-colors"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {message && (
            <p className={`text-sm px-4 py-3 rounded-xl ${
              message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
