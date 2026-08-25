import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null } | undefined>
  refetch: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  updateProfile: async () => undefined,
  refetch: async () => {},
})

// Fetched once here and shared via context, rather than every screen
// (Dashboard, Profile, Progress) re-fetching independently.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (error) {
      // Right after a cold start, the persisted session's access token can
      // still be mid-refresh when this fires, so the very first request can
      // get RLS-rejected (looks like "no row found") even though the row
      // exists - one retry after a short delay clears this up rather than
      // permanently settling on profile=null for the rest of the session
      // (which downstream code - e.g. the first-login tour check - can't
      // tell apart from a genuinely missing profile).
      await new Promise<void>((resolve) => setTimeout(resolve, 800))
      ;({ data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single())
    }
    setProfile((data as Profile | null) ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return }
    fetchProfile()
  }, [user, fetchProfile])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (!error && data) setProfile(data as Profile)
    return { error }
  }, [user])

  const value = useMemo(
    () => ({ profile, loading, updateProfile, refetch: fetchProfile }),
    [profile, loading, updateProfile, fetchProfile]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export const useProfile = () => useContext(ProfileContext)
