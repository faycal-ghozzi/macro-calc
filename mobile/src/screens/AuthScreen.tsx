import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { supabase } from '../lib/supabase'
import { useTheme } from '../theme/ThemeProvider'
import { Screen } from '../components/Screen'

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

export default function AuthScreen() {
  const theme = useTheme()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [showPwRules, setShowPwRules] = useState(false)

  async function handleSubmit() {
    setError(null)

    if (mode === 'register') {
      if (!name.trim()) { setError('Please enter your name.'); return }
      if (!validatePassword(password)) { setError('Password does not meet requirements.'); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }

      setLoading(true)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } },
      })
      setLoading(false)

      if (signUpError) { setError(signUpError.message); return }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setPendingConfirm(true)
    } else {
      setLoading(true)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (signInError) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setError(signInError.message)
      }
    }
  }

  async function handleResend() {
    await supabase.auth.resend({ type: 'signup', email })
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.backgroundElevated,
      borderColor: theme.colors.cardBorder,
      color: theme.colors.textPrimary,
      borderRadius: theme.style.cardRadius - 4,
    },
  ]

  if (pendingConfirm) {
    return (
      <Screen scroll={false}>
        <View style={styles.centerFill}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentSoft, width: 80, height: 80, borderRadius: 40 }]}>
            <Ionicons name="mail-outline" size={36} color={theme.colors.accent} />
          </View>
          <Text style={[styles.title, { color: theme.colors.textPrimary, marginTop: 20 }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            We sent a confirmation link to{'\n'}
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{email}</Text>
          </Text>
          <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
            Click the link in the email to activate your account, then come back and sign in.
          </Text>
          <Pressable
            onPress={() => { setPendingConfirm(false); setMode('login') }}
            style={[styles.primaryButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4, marginTop: 28 }]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>Go to Sign In</Text>
          </Pressable>
          <Pressable onPress={handleResend} style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>Resend confirmation email</Text>
          </Pressable>
        </View>
      </Screen>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentSoft }]}>
            <Ionicons name="barbell-outline" size={30} color={theme.colors.accent} />
          </View>
          <Text style={[styles.appName, { color: theme.colors.textPrimary }]}>MacroTrack</Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>Track your nutrition, reach your goals</Text>
        </View>

        <View style={[styles.segment, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 4 }]}>
          {(['login', 'register'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { Haptics.selectionAsync(); setMode(m); setError(null); setShowPwRules(false) }}
              style={[
                styles.segmentButton,
                { borderRadius: theme.style.cardRadius - 8 },
                mode === m && { backgroundColor: theme.colors.accent },
              ]}
            >
              <Text style={[styles.segmentText, { color: mode === m ? theme.colors.onAccent : theme.colors.textSecondary }]}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          {mode === 'register' && (
            <TextInput
              placeholder="Full name"
              placeholderTextColor={theme.colors.textTertiary}
              value={name}
              onChangeText={setName}
              style={inputStyle}
              autoCapitalize="words"
            />
          )}
          <TextInput
            placeholder="Email address"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={theme.colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            onFocus={() => mode === 'register' && setShowPwRules(true)}
            style={inputStyle}
            secureTextEntry
          />
          {mode === 'register' && showPwRules && (
            <View style={[styles.rulesBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}>
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password)
                return (
                  <View key={rule.label} style={styles.ruleRow}>
                    <Ionicons
                      name={ok ? 'checkmark' : 'close'}
                      size={13}
                      color={ok ? theme.colors.success : theme.colors.textTertiary}
                    />
                    <Text style={{ fontSize: 12, color: ok ? theme.colors.success : theme.colors.textSecondary }}>
                      {rule.label}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
          {mode === 'register' && (
            <TextInput
              placeholder="Confirm password"
              placeholderTextColor={theme.colors.textTertiary}
              value={confirm}
              onChangeText={setConfirm}
              style={[
                inputStyle,
                confirm && confirm !== password ? { borderColor: theme.colors.danger } : null,
              ]}
              secureTextEntry
            />
          )}
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.danger + '1A' }]}>
            <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={loading || (mode === 'register' && confirm !== password)}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.style.cardRadius - 4,
              marginTop: 20,
              opacity: loading || (mode === 'register' && confirm !== password) ? 0.5 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  appName: { fontSize: 24, fontWeight: '700' },
  tagline: { fontSize: 13, marginTop: 4 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 18 },
  segment: { flexDirection: 'row', padding: 4, gap: 4 },
  segmentButton: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15 },
  rulesBox: { padding: 12, gap: 6 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorBox: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 },
  primaryButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: '700' },
})
