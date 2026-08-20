import { useState } from 'react'
import { AlertTriangle, LogOut, Undo2, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { deletionPurgeDate } from '../lib/accountDeletion'

export default function AccountPendingDeletion() {
  const { signOut } = useAuth()
  const { profile, updateProfile } = useProfile()
  const [canceling, setCanceling] = useState(false)

  const purgeDate = deletionPurgeDate(profile)

  async function handleCancel() {
    setCanceling(true)
    await updateProfile({ deletion_requested_at: null })
    setCanceling(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Account scheduled for deletion</h1>
          <p className="text-gray-400 text-sm">
            Your account and all your data will be permanently deleted
            {purgeDate ? ` on ${purgeDate.toLocaleDateString()}` : ' in 30 days'}. You can cancel any time before then.
          </p>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={canceling}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
          >
            {canceling ? <Loader2 size={18} className="animate-spin" /> : <Undo2 size={18} />}
            Cancel Deletion
          </button>
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300 py-2 text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
