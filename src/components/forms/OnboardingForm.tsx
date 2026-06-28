'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingForm({ userId }: { userId: string }) {
  const [occupation, setOccupation] = useState('')
  const [hobbies, setHobbies] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSaveProfile = async () => {
    setIsSubmitting(true)
    
    // Форматуємо хобі у масив
    const hobbiesArray = hobbies.split(',').map(h => h.trim()).filter(Boolean)

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        occupation, 
        hobbies: hobbiesArray,
        tone_of_voice: 'analytical, direct' // Дефолтний тон для промпту
      })

    if (!error) {
      router.push('/dashboard')
      router.refresh()
    } else {
      console.error('Помилка збереження профілю:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] p-8 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold text-white">Ініціалізація профілю</h2>
      
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#8b949e]">Основна діяльність (Стек/Роль)</label>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Напр. Frontend Developer, Студент КІ"
            className="w-full rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#c9d1d9] focus:border-[#2f81f7] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#8b949e]">Хобі та інтереси (через кому)</label>
          <input
            type="text"
            value={hobbies}
            onChange={(e) => setHobbies(e.target.value)}
            placeholder="RISC-V, архітектура, автомобілі..."
            className="w-full rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#c9d1d9] focus:border-[#2f81f7] focus:outline-none"
          />
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSubmitting || !occupation}
          className="mt-6 w-full rounded-md bg-[#238636] py-3 text-sm font-medium text-white transition-all hover:bg-[#2ea043] disabled:opacity-50 glow-green"
        >
          {isSubmitting ? 'Запис у БД...' : 'Зберегти контекст'}
        </button>
      </div>
    </div>
  )
}