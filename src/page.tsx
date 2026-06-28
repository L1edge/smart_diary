import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  // Додали await сюди
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/onboarding')
  } else {
    redirect('/dashboard')
  }
}
