'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingForm from '@/components/forms/OnboardingForm'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [session, setSession] = useState<any>(null)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) return

      setSession(session)

      if (!session) {
        setHasProfile(null)
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('occupation')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!isMounted) return

      if (profile?.occupation) {
        router.replace('/dashboard')
        return
      }

      setHasProfile(false)
      setIsLoading(false)
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)

      if (!newSession) {
        setHasProfile(null)
        setIsLoading(false)
        return
      }

      void (async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('occupation')
          .eq('id', newSession.user.id)
          .maybeSingle()

        if (profile?.occupation) {
          router.replace('/dashboard')
          return
        }

        setHasProfile(false)
        setIsLoading(false)
      })()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117] px-6 py-12 text-white">
        <p className="text-sm text-slate-400">Завантаження...</p>
      </div>
    )
  }

  if (session && hasProfile === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117] p-4">
        <OnboardingForm userId={session.user.id} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 to-slate-900 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
        <div className="space-y-6 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Smart Journal</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Інтелектуальний трекінг твого життя
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-300">
              Почни аналізувати свої думки та настрій за допомогою Google Login.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
              <path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.18 3.22l6.85-6.85C35.6 2.4 30.17 0 24 0 14.62 0 6.24 5.76 2.45 13.9l7.94 6.16C12.9 13.65 18.97 9.5 24 9.5z" />
              <path fill="#34A853" d="M46.5 24.5c0-1.61-.14-3.16-.4-4.65H24v9.05h12.7c-.55 2.95-2.2 5.45-4.7 7.12l7.23 5.62C43.88 37.22 46.5 31.34 46.5 24.5z" />
              <path fill="#FBBC05" d="M12.39 29.74c-.82-2.45-1.28-5.05-1.28-7.74s.46-5.29 1.28-7.74L4.45 8.1C2.58 11.82 1.5 15.76 1.5 20s1.08 8.18 2.95 11.9l8.94-2.16z" />
              <path fill="#EA4335" d="M24 48c6.18 0 11.62-2.04 15.94-5.54l-7.23-5.62c-2.55 1.71-5.48 2.74-8.71 2.74-5.03 0-9.1-4.15-9.97-9.58L4.45 39.9C6.24 44.24 14.62 48 24 48z" />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Увійти через Google
          </button>
        </div>
      </div>
    </div>
  )
}
