'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NeonButton } from '@/components/ui'

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

function truncateTitle(value: string, maxLength = 30) {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'Новий запис'
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1)}…`
}

function deriveTitle(text: string) {
  return truncateTitle(text, 30)
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

export default function EntryDetailPage() {
  const router = useRouter()
  const params = useParams<{ entryId: string }>()
  const entryId = params.entryId
  const supabase = useMemo(() => createClient(), [])
  const [entry, setEntry] = useState<DashboardEntry | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadEntry = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/onboarding')
        return
      }

      if (!entryId) {
        router.replace('/dashboard')
        return
      }

      const { data, error } = await supabase.from('daily_logs').select('*').eq('id', entryId).maybeSingle()
      if (!isActive) return

      if (error || !data) {
        router.replace('/dashboard')
        return
      }

      const currentEntry = data as DashboardEntry
      setEntry(currentEntry)
      setDraftTitle(truncateTitle(currentEntry.title?.trim() || deriveTitle(currentEntry.raw_text || ''), 30))
      setDraftText(currentEntry.raw_text || '')
    }

    void loadEntry()

    return () => {
      isActive = false
    }
  }, [entryId, router, supabase])

  if (!entry) {
    return null
  }

  const handleSave = async () => {
    if (!entry) return

    const nextTitle = truncateTitle(draftTitle.trim() || deriveTitle(draftText), 30)
    const nextText = draftText.trim()
    const titleChanged = (entry.title?.trim() || deriveTitle(entry.raw_text || '')) !== nextTitle
    const shouldAnalyze = shouldReanalyze(entry.raw_text || '', nextText) || titleChanged

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Користувача не знайдено')

      const updatePayload: Record<string, unknown> = {
        title: nextTitle,
        raw_text: nextText || entry.raw_text,
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
            text: nextText || entry.raw_text,
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

      const { error } = await supabase.from('daily_logs').update(updatePayload).eq('id', entry.id)
      if (error) throw error

      setEntry((current) =>
        current
          ? {
              ...current,
              title: nextTitle,
              raw_text: nextText || entry.raw_text,
              ...(analysisPayload ? { mood: analysisPayload.mood as number | null, energy: analysisPayload.energy as number | null, stress: analysisPayload.stress as number | null, tags: analysisPayload.tags as string[] | null, insight_sentence: analysisPayload.insight_sentence as string | null, goals_progress: analysisPayload.goals_progress as Array<{ goal_name: string; progress_made: boolean; details: string }> | null, upcoming_events: analysisPayload.upcoming_events as Array<{ event_name: string; date: string; time: string }> | null, checklist_hits: analysisPayload.checklist_hits as Array<{ habit_name: string; completed: boolean }> | null, follow_up_questions: analysisPayload.follow_up_questions as string[] | null } : {}),
            }
          : current
      )
    } catch (error: any) {
      console.error('Не вдалося зберегти запис:', error.message)
      alert(`Помилка: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!entryId) return

    const confirmed = window.confirm('Видалити цей запис із історії?')
    if (!confirmed) return

    setIsDeleting(true)

    try {
      const { error } = await supabase.from('daily_logs').delete().eq('id', entryId)
      if (error) throw error
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Не вдалося видалити запис:', error.message)
      alert(`Помилка: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] px-4 py-6 pb-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="glass-panel rounded-[28px] p-6 sm:p-8">
          <Link href="/dashboard" className="mb-4 inline-flex text-sm text-fuchsia-300 hover:text-fuchsia-200">
            ← Назад до дашборду
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-400/80">Запис</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Запис</h1>
            </div>
            <p className="text-sm text-gray-400">{new Date(entry.created_at).toLocaleString('uk-UA')}</p>
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-6 sm:p-7">
          <label className="mb-4 block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-gray-500">Заголовок</span>
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value.slice(0, 30))}
              maxLength={30}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 transition-all duration-300 focus:border-[#FF00FF]/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-[#FF00FF]/50"
              placeholder="Введіть заголовок..."
            />
            <p className="mt-2 text-xs text-gray-500">До 30 символів</p>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-gray-500">Текст запису</span>
            <textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={10}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-gray-200 placeholder-gray-600 transition-all duration-300 focus:border-[#FF00FF]/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-[#FF00FF]/50"
              placeholder="Додайте або відредагуйте текст..."
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <NeonButton onClick={handleSave} disabled={isSaving || !draftText.trim()}>
              {isSaving ? 'Збереження...' : 'Зберегти зміни'}
            </NeonButton>
            <div className="rounded-full border border-[#8A2BE2]/20 bg-[#8A2BE2]/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#8A2BE2]">
              {shouldReanalyze(entry.raw_text || '', draftText) ? 'Переаналіз' : 'Збережено'}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-6 sm:p-7">
          <NeonButton onClick={handleDelete} disabled={isDeleting} className="w-full rounded-full border border-rose-500/30 bg-black/70 px-4 py-2 text-[10px] tracking-[0.25em]">
            {isDeleting ? 'Видалення...' : 'Видалити'}
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
