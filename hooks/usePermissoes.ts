'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Modulo } from '@/lib/modulos'

interface Permissoes {
  nivel: 'admin' | 'agente' | null
  modulosPermitidos: Modulo[]
  podeAcessar: (modulo: Modulo) => boolean
  carregando: boolean
}

export function usePermissoes(): Permissoes {
  const [nivel, setNivel] = useState<'admin' | 'agente' | null>(null)
  const [modulosPermitidos, setModulosPermitidos] = useState<Modulo[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCarregando(false); return }

      const { data: perfil } = await supabase
        .from('perfis')
        .select('nivel, modulos_permitidos')
        .eq('id', user.id)
        .single()

      if (perfil) {
        setNivel(perfil.nivel as 'admin' | 'agente')
        setModulosPermitidos(perfil.modulos_permitidos as Modulo[])
      }
      setCarregando(false)
    }

    carregar()
  }, [])

  function podeAcessar(modulo: Modulo): boolean {
    if (nivel === 'admin') return true
    return modulosPermitidos.includes(modulo)
  }

  return { nivel, modulosPermitidos, podeAcessar, carregando }
}
