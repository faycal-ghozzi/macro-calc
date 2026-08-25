import { ReactNode } from 'react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { OfflineScreen } from './OfflineScreen'

// This app has no offline mode - every screen below this point assumes a
// live Supabase connection. Block everything behind a blocking screen
// while offline (cold start or mid-session alike) rather than letting
// providers below fail into confusing half-loaded states.
export function ConnectivityGate({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus()
  if (!isOnline) return <OfflineScreen />
  return <>{children}</>
}
