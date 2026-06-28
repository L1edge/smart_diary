import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

type DashboardEntry = {
  id: string
  created_at: string
  raw_text: string
  title?: string | null
  mood?: number | null
  energy?: number | null
  stress?: number | null
  tags?: string[] | null
  insight_sentence?: string | null
  goals_progress?: Array<{ goal_name: string; progress_made: boolean; details: string }> | null
  upcoming_events?: Array<{ event_name: string; date: string; time: string }> | null
  checklist_hits?: Array<{ habit_name: string; completed: boolean }> | null
  follow_up_questions?: string[] | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/onboarding')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('occupation')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!profile?.occupation) {
    redirect('/onboarding')
  }

  const { data: entries, error } = await supabase
    .from('daily_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return <DashboardClient initialEntries={(entries as DashboardEntry[]) ?? []} userEmail={session.user.email ?? 'user'} />
}