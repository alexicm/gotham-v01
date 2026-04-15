// app/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LoginScreen } from '@/components/LoginScreen'
import { createClient } from '@/lib/supabase/client'

const CnaeDesktop = dynamic(
  () => import('@/components/CnaeDesktop').then(m => ({ default: m.CnaeDesktop })),
  { ssr: false }
)

export default function Home() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null) // null = carregando

  useEffect(() => {
    const supabase = createClient()

    // Verificar sessão atual
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAutenticado(!!user)
    })

    // Ouvir mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = useCallback(() => setAutenticado(true), [])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAutenticado(false)
  }, [])

  // Tela de carregamento durante verificação de sessão
  if (autenticado === null) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#d4c4a8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: '3px solid #c8b888', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return autenticado
    ? <CnaeDesktop onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />
}
