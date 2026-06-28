'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NeonButton } from '@/components/ui'

export function BottomNav() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error.message)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="fixed bottom-6 left-1/2 w-[90%] max-w-sm -translate-x-1/2">
      <div className="glass-panel flex items-center justify-between rounded-full px-4 py-3">
        <NeonButton
          onClick={handleLogout}
          className="!w-auto rounded-full border border-fuchsia-500/30 bg-black/70 px-4 py-2 text-[10px] tracking-[0.25em]"
        >
          Logout
        </NeonButton>

        <button className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full border-4 border-[#050507] bg-fuchsia-500 text-2xl text-white glow-pink">
          +
        </button>

        <button className="p-3 text-gray-400 transition-colors hover:text-white" aria-label="Insights">
          <div className="h-6 w-6 rounded-md bg-white/10"></div>
        </button>
      </div>
    </div>
  )
}

export default BottomNav
