import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiaryForm from '@/components/forms/DiaryForm'
import { BottomNav, ProgressTrack, StatusCard } from '@/components/ui'

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
    <div className="min-h-screen bg-[#050507] px-4 py-6 pb-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="glass-panel rounded-[28px] p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-400/80">Smart Diary</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Дашборд</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400 sm:text-base">
                Авторизовано як <span className="text-[#58a6ff]">{session.user.email}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-200">
              Налаштування та щоденні ритуали в одному місці
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard
            title="Настрій"
            value="7/10"
            icon={<span className="text-xl text-fuchsia-300">✦</span>}
          />
          <StatusCard
            title="Енергія"
            value="82%"
            icon={<span className="text-xl text-fuchsia-300">⚡</span>}
          />
          <StatusCard
            title="Ритуал"
            value="3/5"
            icon={<span className="text-xl text-fuchsia-300">⏱</span>}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DiaryForm />

          <div className="space-y-4">
            <ProgressTrack label="Прогрес до цілей" percentage={72} />
            <ProgressTrack label="Стабільність тижня" percentage={64} />
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-sm font-medium text-gray-300">Порада</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Пиши щодня по 3-5 рядків — так AI краще розуміє твої ритми й допомагає планувати дії.
              </p>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  )
}