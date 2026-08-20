import { Profile } from '../types'

export const DELETION_GRACE_PERIOD_DAYS = 30

export function isDeletionPending(profile: Profile | null): boolean {
  return !!profile?.deletion_requested_at
}

export function deletionPurgeDate(profile: Profile | null): Date | null {
  if (!profile?.deletion_requested_at) return null
  const date = new Date(profile.deletion_requested_at)
  date.setDate(date.getDate() + DELETION_GRACE_PERIOD_DAYS)
  return date
}
