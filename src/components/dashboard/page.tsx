import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient, { type DashboardEntry } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/onboarding')
  }

  const { data: entries } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  // 1. Шукаємо ім'я в метаданих (якщо зайшов через Google)
  let userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name

  // 2. Якщо імені немає (зайшов по Email), робимо нікнейм з емейлу
  if (!userName && session.user.email) {
    userName = session.user.email.split('@')[0] // 'artykosik@gmail.com' -> 'artykosik'
  }

  return (
    <DashboardClient 
      initialEntries={(entries as DashboardEntry[]) ?? []} 
      userEmail={session.user.email ?? 'user'} 
      userName={userName} 
    />
  )
}