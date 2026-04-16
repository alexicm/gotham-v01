// app/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LoginScreen } from '@/components/LoginScreen'
import { LoadingScreen } from '@/components/LoadingScreen'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const CnaeDesktop = dynamic(
  () => import('@/components/CnaeDesktop').then(m => ({ default: m.CnaeDesktop })),
  { ssr: false }
)

export default function Home() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)
  const [timerDone, setTimerDone] = useState(false)

  // Timer mínimo de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => setTimerDone(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Verificação de sessão
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }: { data: { user: unknown } }) => {
      setAutenticado(!!user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setAutenticado(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = useCallback(() => setAutenticado(true), [])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAutenticado(false)
  }, [])

  // Mostrar loading enquanto timer não acabou OU sessão não foi verificada
  if (!timerDone || autenticado === null) {
    return <LoadingScreen />
  }

  return autenticado
    ? <CnaeDesktop onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />
}
