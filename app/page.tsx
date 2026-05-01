'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LoginScreen } from '@/components/LoginScreen'
import { LoadingScreen } from '@/components/LoadingScreen'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const AppShell = dynamic(
  () => import('@/components/AppShell').then(m => ({ default: m.AppShell })),
  { ssr: false },
)

export default function Home() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)
  const [timerDone, setTimerDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimerDone(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }: { data: { user: unknown } }) => {
      setAutenticado(!!user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setAutenticado(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = useCallback(() => setAutenticado(true), [])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAutenticado(false)
  }, [])

  if (!timerDone || autenticado === null) {
    return <LoadingScreen />
  }

  return autenticado ? <AppShell onLogout={handleLogout} /> : <LoginScreen onLogin={handleLogin} />
}
