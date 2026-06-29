'use client'

import { useEffect, useMemo, useState, type TouchEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNav, NeonButton, ProgressTrack, StatusCard } from '@/components/ui'
import DiaryForm from '@/components/forms/DiaryForm'

export type DashboardEntry = {
  id: string
  created_at: string
  raw_text: string
  title?: string | null
  mood?: number | null
  energy?: number | null
  stress?: number | null
  ritual?: number | null // Додано на випадок, якщо колонка існує
  tags?: string[] | null
  insight_sentence?: string | null
  goals_progress?: Array<{ goal_name: string; progress_made: boolean; details: string }> | null
  upcoming_events?: Array<{ event_name: string; date: string; time: string }> | null
  checklist_hits?: Array<{ habit_name: string; completed: boolean }> | null
  follow_up_questions?: string[] | null
}

type DashboardClientProps = {
  initialEntries: DashboardEntry[]
  userEmail: string
  userName?: string | null // Додаємо опціональне поле для імені/ніка
}

function deriveTitle(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > 72 ? `${cleaned.slice(0, 69)}...` : cleaned || 'Новий запис'
}

function getEntryTitle(entry: DashboardEntry) {
  const provided = entry.title?.trim()
  if (provided) return provided
  return deriveTitle(entry.raw_text || '')
}

function truncateTitle(value: string, maxLength = 30) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

function formatEntryDate(value: string) {
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const olderThanMonth = now.getTime() - date.getTime() > 30 * 24 * 60 * 60 * 1000
  const olderThanYear = now.getFullYear() !== date.getFullYear()

  if (sameDay) {
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric' }).format(date)
  }

  if (olderThanYear) {
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  }

  if (olderThanMonth) {
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(date)
  }

  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(date)
}

function shouldReanalyze(originalText: string, updatedText: string) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-zа-яіїєґ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)

  const a = normalize(originalText)
  const b = normalize(updatedText)

  if (!a.length || !b.length) return true
  if (a.join(' ') === b.join(' ')) return false

  const overlap = a.filter((token) => b.includes(token)).length
  const similarity = overlap / Math.max(a.length, b.length)
  const lengthDelta = Math.abs(updatedText.length - originalText.length)

  return similarity < 0.35 || lengthDelta > 120
}

export default function DashboardClient({ initialEntries, userEmail, userName }: DashboardClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState(initialEntries)
  const initialSelected = initialEntries[0] ?? null
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialSelected?.id ?? null)
  const [draftTitle, setDraftTitle] = useState(initialSelected ? getEntryTitle(initialSelected) : '')
  const [draftText, setDraftText] = useState(initialSelected?.raw_text || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [mobileMenuEntryId, setMobileMenuEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedEntryId && entries.length > 0) {
      setSelectedEntryId(entries[0].id)
      return
    }

    if (selectedEntryId && !entries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(entries[0]?.id ?? null)
    }
  }, [entries, selectedEntryId])

  useEffect(() => {
    if (!selectedEntryId) {
      setDraftTitle('')
      setDraftText('')
      return
    }

    const selectedEntry = entries.find((entry) => entry.id === selectedEntryId)
    if (selectedEntry) {
      setDraftTitle(getEntryTitle(selectedEntry))
      setDraftText(selectedEntry.raw_text || '')
    }
  }, [entries, selectedEntryId])

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null

  // --- ДИНАМІЧНІ МЕТРИКИ ---
  // Використовуємо useMemo, щоб перераховувати тільки тоді, коли змінюється список entries
  const currentMetrics = useMemo(() => {
    const latest = entries[0] // Беремо найновіший запис
    
    if (!latest) return { mood: '—', energy: '—', ritual: '—' }

    // 1. Форматуємо настрій
    const mood = latest.mood != null ? `${latest.mood}/10` : '—'

    // 2. Форматуємо енергію (адаптація до відсотків)
    let energy = '—'
    if (latest.energy != null) {
      const eValue = latest.energy <= 10 ? latest.energy * 10 : latest.energy
      energy = `${eValue}%`
    }

    // 3. Форматуємо ритуал
    let ritual = '—'
    if (latest.ritual != null) {
      ritual = `${latest.ritual}/5`
    } else if (latest.checklist_hits && Array.isArray(latest.checklist_hits)) {
      // Фолбек: рахуємо виконані звички з JSON
      const completed = latest.checklist_hits.filter((hit) => hit.completed).length
      ritual = `${completed}/5`
    }

    return { mood, energy, ritual }
  }, [entries])

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null)
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX === null) return

    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX

    if (touchStartX < 40 && delta > 80) {
      setIsMobileDrawerOpen(true)
    } else if (delta < -80) {
      setIsMobileDrawerOpen(false)
    }

    setTouchStartX(null)
  }

  const handleSelectEntry = (entryId: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      router.push(`/dashboard/${entryId}`)
      setIsMobileDrawerOpen(false)
      return
    }

    setSelectedEntryId(entryId)
    setIsMobileDrawerOpen(false)
  }

  const handleNewEntryClick = () => {
    setIsMobileDrawerOpen(false)
    document.getElementById('new-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const refreshEntries = async () => {
    setIsRefreshing(true)

    try {
      const { data, error } = await supabase.from('daily_logs').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setEntries((data as DashboardEntry[]) ?? [])
    } catch (error) {
      console.error('Не вдалося оновити записи:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!selectedEntry) return

    const nextTitle = draftTitle.trim() || deriveTitle(draftText)
    const nextText = draftText.trim()
    const shouldAnalyze = shouldReanalyze(selectedEntry.raw_text || '', nextText)

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Користувача не знайдено')

      const updatePayload: Record<string, unknown> = {
        title: nextTitle,
        raw_text: nextText || selectedEntry.raw_text,
      }

      let analysisPayload: Record<string, unknown> | null = null

      if (shouldAnalyze) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('occupation, hobbies')
          .eq('id', user.id)
          .single()

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: nextText || selectedEntry.raw_text,
            userContext: {
              occupation: profile?.occupation ?? '',
              hobbies: profile?.hobbies ?? '',
            },
          }),
        })

        const data = await res.json()
        if (data.error) throw new Error(data.details || data.error)

        analysisPayload = {
          mood: data.mood,
          energy: data.energy,
          stress: data.stress,
          tags: data.tags,
          insight_sentence: data.insight_sentence,
          goals_progress: data.goals_progress,
          upcoming_events: data.upcoming_events,
          checklist_hits: data.checklist_hits,
          follow_up_questions: data.follow_up_questions,
        }
      }

      if (analysisPayload) {
        Object.assign(updatePayload, analysisPayload)
      }

      const { error } = await supabase.from('daily_logs').update(updatePayload).eq('id', selectedEntry.id)

      if (error) {
        if (/title|column/i.test(error.message)) {
          const fallbackPayload = { ...updatePayload }
          delete fallbackPayload.title
          const { error: fallbackError } = await supabase.from('daily_logs').update(fallbackPayload).eq('id', selectedEntry.id)
          if (fallbackError) throw fallbackError
        } else {
          throw error
        }
      }

      await refreshEntries()
    } catch (error: any) {
      console.error('Не вдалося зберегти запис:', error.message)
      alert(`Помилка: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteEntry = async (entryId?: string) => {
    const targetEntry = entries.find((entry) => entry.id === entryId) ?? selectedEntry
    if (!targetEntry) return

    const confirmed = window.confirm('Видалити цей запис із історії?')
    if (!confirmed) return

    setIsDeleting(true)

    try {
      const { error } = await supabase.from('daily_logs').delete().eq('id', targetEntry.id)
      if (error) throw error

      const nextEntries = entries.filter((entry) => entry.id !== targetEntry.id)
      setEntries(nextEntries)
      setMobileMenuEntryId(null)

      if (selectedEntry?.id === targetEntry.id) {
        setSelectedEntryId(nextEntries[0]?.id ?? null)
      }

      if (entries.length <= 1) {
        router.refresh()
      }
    } catch (error: any) {
      console.error('Не вдалося видалити запис:', error.message)
      alert(`Помилка: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRenameEntry = async (entry: DashboardEntry) => {
    const nextTitleInput = window.prompt('Перейменувати запис', getEntryTitle(entry))
    if (nextTitleInput === null) return

    const nextTitle = nextTitleInput.trim()
    if (!nextTitle) return

    try {
      const { error } = await supabase.from('daily_logs').update({ title: nextTitle }).eq('id', entry.id)
      if (error) throw error
      await refreshEntries()
      setMobileMenuEntryId(null)
    } catch (error: any) {
      console.error('Не вдалося перейменувати запис:', error.message)
      alert(`Помилка: ${error.message}`)
    }
  }

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
    <div
      className="min-h-screen bg-[#050507] px-4 py-6 pb-24 text-white sm:px-6 lg:px-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={() => setIsMobileDrawerOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-fuchsia-500/20 bg-black/70 text-lg text-fuchsia-200 shadow-[0_0_30px_rgba(255,0,255,0.12)] lg:hidden"
        aria-label="Open history"
      >
        ☰
      </button>

      <div className={`fixed inset-0 z-50 transition-all duration-300 lg:hidden ${isMobileDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${isMobileDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileDrawerOpen(false)}
        />
        <div className={`relative flex h-full w-[92vw] max-w-sm flex-col border-r border-white/10 bg-[#050507]/95 p-4 shadow-2xl transition-transform ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-400/80">History</p>
              <h2 className="text-lg font-semibold text-white">Записи</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <NeonButton onClick={handleNewEntryClick} className="rounded-full border border-fuchsia-500/30 bg-black/70 px-4 py-2 text-[10px] tracking-[0.25em]">
              Новий запис
            </NeonButton>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {entries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                Ще немає записів.
              </div>
            ) : (
              entries.map((entry) => {
                const itemTitle = truncateTitle(getEntryTitle(entry))

                return (
                  <div key={entry.id} className="relative">
                    <button
                      type="button"
                      onClick={() => handleSelectEntry(entry.id)}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 pr-12 text-left transition-all hover:border-fuchsia-500/20 hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">{formatEntryDate(entry.created_at)}</p>
                          <p className="mt-1 text-sm font-medium text-white">{itemTitle}</p>
                        </div>
                      </div>
                    </button>

                  </div>
                )
              })
            )}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <NeonButton onClick={handleLogout} className="rounded-full border border-fuchsia-500/30 bg-black/70 px-4 py-2 text-[10px] tracking-[0.25em]">
              Logout
            </NeonButton>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="glass-panel rounded-[28px] p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-400/80">Smart Diary</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Дашборд</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400 sm:text-base">
                Авторизовано як <span className="text-[#58a6ff]">{userName || userEmail}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-200">
              Історія записів, редагування та швидкий огляд у одному місці
            </div>
          </div>
        </header>

        {/* ДИНАМІЧНИЙ БЛОК МЕТРИК */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard title="Настрій" value={currentMetrics.mood} icon={<span className="text-xl text-fuchsia-300">✦</span>} />
          <StatusCard title="Енергія" value={currentMetrics.energy} icon={<span className="text-xl text-fuchsia-300">⚡</span>} isAccent={true} />
          <StatusCard title="Ритуал" value={currentMetrics.ritual} icon={<span className="text-xl text-fuchsia-300">⏱</span>} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="glass-panel hidden rounded-[28px] p-5 sm:p-6 lg:block">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Історія записів</h2>
                <p className="mt-1 text-sm text-gray-400">Оберіть попередній запис, щоб відкрити його</p>
              </div>
              <div className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-fuchsia-300">
                {isRefreshing ? 'Оновлення...' : `${entries.length} записів`}
              </div>
            </div>

            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                  Ще немає записів. Створи перший зліва.
                </div>
              ) : (
                entries.map((entry) => {
                  const isActive = entry.id === selectedEntry?.id
                  const itemTitle = getEntryTitle(entry)

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntryId(entry.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${
                        isActive
                          ? 'border-fuchsia-500/40 bg-fuchsia-500/10 shadow-[0_0_30px_rgba(255,0,255,0.12)]'
                          : 'border-white/10 bg-black/20 hover:border-fuchsia-500/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">{formatEntryDate(entry.created_at)}</p>
                          <p className="mt-1 text-sm font-medium text-white">{itemTitle}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
                            {entry.raw_text?.trim() || 'Без тексту'}
                          </p>
                        </div>
                        <div className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">
                          {entry.mood ?? '—'}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="hidden lg:block glass-panel rounded-[28px] p-6 sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Вибраний запис</h2>
                  <p className="mt-1 text-sm text-gray-400">Показуємо повний текст і дозволяємо внести новий контекст</p>
                </div>
                {selectedEntry && (
                  <NeonButton
                    onClick={handleDeleteEntry}
                    className="w-auto! rounded-full border border-rose-500/30 bg-black/70 px-4 py-2 text-[10px] tracking-[0.25em]"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Видалення...' : 'Видалити'}
                  </NeonButton>
                )}
              </div>

              {selectedEntry ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-gray-500">Заголовок</span>
                    <input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 transition-all duration-300 focus:border-[#FF00FF]/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-[#FF00FF]/50"
                      placeholder="Введіть заголовок..."
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-gray-500">Текст запису</span>
                    <textarea
                      value={draftText}
                      onChange={(event) => setDraftText(event.target.value)}
                      rows={8}
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-gray-200 placeholder-gray-600 transition-all duration-300 focus:border-[#FF00FF]/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-[#FF00FF]/50"
                      placeholder="Додайте або відредагуйте текст..."
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <NeonButton onClick={handleSaveEntry} disabled={isSaving || !draftText.trim()}>
                      {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                    </NeonButton>
                    <div className="rounded-full border border-[#8A2BE2]/20 bg-[#8A2BE2]/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#8A2BE2]">
                      {shouldReanalyze(selectedEntry.raw_text || '', draftText) ? 'Переаналіз' : 'Збережено'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                  Оберіть запис із історії, щоб переглянути його повний текст та внести правки.
                </div>
              )}
            </div>

            <div id="new-entry-form">
              <DiaryForm onSaved={refreshEntries} />
            </div>

            <div className="hidden lg:block space-y-4">
              <ProgressTrack label="Прогрес до цілей" percentage={72} />
              <ProgressTrack label="Стабільність тижня" percentage={64} />
              <div className="glass-panel rounded-2xl p-5">
                <p className="text-sm font-medium text-gray-300">Порада</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Пиши щодня по 3-5 рядків — так AI краще розуміє твої ритми й допомагає планувати дії.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  )
}