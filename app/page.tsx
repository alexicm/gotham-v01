'use client'

import { useState, useCallback } from 'react'
import { CnaeDesktop } from '@/components/CnaeDesktop'
import { LoginScreen } from '@/components/LoginScreen'

export default function Home() {
  const [autenticado, setAutenticado] = useState(false)

  const handleLogin  = useCallback(() => setAutenticado(true),  [])
  const handleLogout = useCallback(() => setAutenticado(false), [])

  return autenticado
    ? <CnaeDesktop onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />
}
