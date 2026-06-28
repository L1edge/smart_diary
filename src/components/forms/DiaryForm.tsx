'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client' // Підключаємо клієнт БД

export default function DiaryForm() {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const supabase = createClient()

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setIsAnalyzing(true)
    
    try {
      // 1. Отримуємо ID поточного користувача
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Користувача не знайдено')

      // 2. Аналіз через наш API (Gemini)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userContext: {
            occupation: 'Frontend Developer',
            hobbies: 'cars, gym, Next.js, girls'
          }
        }),
      })

      const data = await res.json()
      
      if (data.error) {
        throw new Error(data.details || data.error)
      }

      setResult(data)

      // 3. Записуємо результат у Supabase
      const { error: dbError } = await supabase
        .from('daily_logs')
        .insert({
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
          follow_up_questions: data.follow_up_questions
        })

      if (dbError) throw dbError

      // Очищаємо форму після успішного запису
      setText('')
      
    } catch (error: any) {
      console.error('Помилка процесу:', error.message)
      alert(`Помилка: ${error.message}`) // Простий алерт для дебагу
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-lg">
      <h2 className="mb-4 text-xl font-semibold text-white">Новий запис</h2>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Що було сьогодні? Як рух до цілей? Що пофіксив?"
        className="h-32 w-full resize-none rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:border-[#2f81f7] focus:outline-none focus:ring-1 focus:ring-[#2f81f7]"
        disabled={isAnalyzing}
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-[#8b949e]">
          Gemini 3.1 Flash-Lite AI Engine
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !text.trim()}
          className="rounded-md border border-[#30363d] bg-[#238636] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-50 glow-green"
        >
          {isAnalyzing ? 'Синхронізація...' : 'Записати'}
        </button>
      </div>

      {result && (
        <div className="mt-6 rounded-md border border-[#30363d] bg-[#0d1117] p-4">
          <h3 className="mb-2 text-sm font-semibold text-[#58a6ff]">API Response: Успішно збережено</h3>
          <pre className="overflow-x-auto text-xs text-[#8b949e]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}