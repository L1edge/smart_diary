import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiaryForm from '@/components/forms/DiaryForm'

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

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#0d1117] p-8">
      <div className="mb-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-white">Дашборд</h1>
        <p className="text-[#8b949e]">
          Авторизовано як: <span className="text-[#58a6ff]">{session.user.email}</span>
        </p>
      </div>

      <DiaryForm />
    </div>
  )
}