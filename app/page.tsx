'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LoginScreen } from '@/components/LoginScreen'

// Desabilita SSR para evitar acesso a window.matchMedia durante hidratacao
const CnaeDesktop = dynamic(
  () => import('@/components/CnaeDesktop').then((m) => ({ default: m.CnaeDesktop })),
  { ssr: false }
)

export default function Home() {
  const [autenticado, setAutenticado] = useState(false)

  const handleLogin  = useCallback(() => setAutenticado(true),  [])
  const handleLogout = useCallback(() => setAutenticado(false), [])

  return autenticado
    ? <CnaeDesktop onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />
}
