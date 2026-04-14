'use client'

import { useState } from 'react'
import { CnaeDesktop } from '@/components/CnaeDesktop'
import { LoginScreen } from '@/components/LoginScreen'

export default function Home() {
  const [autenticado, setAutenticado] = useState(false)

  if (!autenticado) {
    return <LoginScreen onLogin={() => setAutenticado(true)} />
  }

  return <CnaeDesktop />
}
