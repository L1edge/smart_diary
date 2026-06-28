'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NeonButton } from '@/components/ui'

type DiaryFormProps = {
  onSaved?: () => void | Promise<void>
}

export default function DiaryForm({ onSaved }: DiaryFormProps) {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const supabase = createClient()

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setIsAnalyzing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Користувача не знайдено')

      const { data: profile } = await supabase
        .from('profiles')
        .select('occupation, hobbies')
        .eq('id', user.id)
        .maybeSingle()

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userContext: {
            occupation: profile?.occupation ?? '',
            hobbies: profile?.hobbies ?? '',
          },
        }),
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.details || data.error)
      }

      const { error: dbError } = await supabase.from('daily_logs').insert({
        user_id: user.id,
        raw_text: text,
        mood: data.mood,
        energy: data.energy,
        stress: data.stress,
        tags: data.tags,
        insight_sentence: data.insight_sentence,
        goals_progress: data.goals_progress,
        upcoming_events: data.upcoming_events,
        checklist_hits: data.checklist_hits,
        follow_up_questions: data.follow_up_questions,
      })

      if (dbError) throw dbError

      setText('')
      await onSaved?.()
    } catch (error: any) {
      console.error('Помилка процесу:', error.message)
      alert(`Помилка: ${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="glass-panel w-full rounded-[28px] p-6 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Новий запис</h2>
          <p className="mt-1 text-sm text-gray-400">Gemini 3.1 Flash-Lite AI Engine</p>
        </div>
        <div className="rounded-full border border-[#8A2BE2]/20 bg-[#8A2BE2]/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#8A2BE2]">
          Live
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Що було сьогодні?..."
        className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-gray-200 placeholder-gray-600 transition-all duration-300 focus:border-[#FF00FF]/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-[#FF00FF]/50"
        rows={5}
        disabled={isAnalyzing}
      />

      <div className="mt-4">
        <NeonButton onClick={handleAnalyze} disabled={isAnalyzing || !text.trim()}>
          {isAnalyzing ? 'Синхронізація...' : 'Записати'}
        </NeonButton>
      </div>
    </div>
  )
}