import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Dumbbell, Check, X, Mail } from 'lucide-react'

interface PasswordRule {
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: '1 uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: '1 lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: '1 number', test: (pw) => /\d/.test(pw) },
  { label: '1 symbol (!@#...)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

function validatePassword(pw: string) {
  return PASSWORD_RULES.every((r) => r.test(pw))
}

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [showPwRules, setShowPwRules] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'register') {
      if (!name.trim()) { setError('Please enter your name.'); return }
      if (!validatePassword(password)) { setError('Password does not meet requirements.'); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }

      setLoading(true)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: globalThis.location.origin,
        },
      })
      setLoading(false)

      if (signUpError) { setError(signUpError.message); return }
      setPendingConfirm(true)
    } else {
      setLoading(true)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (signInError) setError(signInError.message)
    }
  }

  async function handleResend() {
    await supabase.auth.resend({ type: 'signup', email })
  }

  if (pendingConfirm) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-3xl">
            <Mail size={36} className="text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="text-gray-400 text-sm">
              We sent a confirmation link to<br />
              <span className="text-white font-medium">{email}</span>
            </p>
          </div>
          <p className="text-gray-500 text-xs">
            Click the link in the email to activate your account.<br />
            Then come back and sign in.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setPendingConfirm(false); setMode('login') }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-2xl py-4 transition-colors"
            >
              Go to Sign In
            </button>
            <button onClick={handleResend} className="w-full text-gray-500 hover:text-gray-300 text-sm transition-colors py-2">
              Resend confirmation email
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl">
            <Dumbbell size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">MacroTrack</h1>
          <p className="text-gray-500 text-sm">Track your nutrition, reach your goals</p>
        </div>

        <div className="flex bg-gray-900 rounded-2xl p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setShowPwRules(false) }}
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
            {mode === 'register' && (
              <input
                type="text"
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            )}
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 transition-colors"
            />
            <div>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => mode === 'register' && setShowPwRules(true)}
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
              {mode === 'register' && showPwRules && (
                <div className="mt-2 bg-gray-900 rounded-xl p-3 space-y-1.5">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password)
                    return (
                      <div key={rule.label} className="flex items-center gap-2">
                        {ok ? (
                          <Check size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <X size={13} className="text-gray-600 shrink-0" />
                        )}
                        <span className={`text-xs ${ok ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {rule.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {mode === 'register' && (
              <input
                type="password"
                required
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full bg-gray-900 border rounded-2xl px-4 py-4 text-white placeholder-gray-600 text-sm outline-none transition-colors ${
                  confirm && confirm !== password
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-gray-800 focus:border-emerald-500'
                }`}
              />
            )}
          </div>

          {error && (
            <p className="text-sm px-4 py-3 rounded-xl bg-red-500/10 text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'register' && confirm !== password)}
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
