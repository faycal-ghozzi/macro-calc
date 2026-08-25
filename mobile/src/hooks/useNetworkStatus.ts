import { useNetInfo } from '@react-native-community/netinfo'

// isInternetReachable is more meaningful than isConnected (which is only
// "attached to a network", not "that network actually reaches the internet")
// but it briefly reads `null` right after launch while the OS is still
// probing - treat that as online rather than flashing the offline screen.
export function useNetworkStatus(): { isOnline: boolean } {
  const { isConnected, isInternetReachable } = useNetInfo()
  const isOnline = isConnected !== false && isInternetReachable !== false
  return { isOnline }
}
