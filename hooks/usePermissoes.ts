'use client'

import { useState, useEffect, useCallback } from 'react'
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
    let mounted = true
    const supabase = createClient()

    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!user) { setCarregando(false); return }

      const { data: perfil, error } = await supabase
        .from('perfis')
        .select('nivel, modulos_permitidos')
        .eq('id', user.id)
        .single()

      if (!mounted) return

      if (error) {
        console.error('[usePermissoes] Erro ao carregar perfil:', error.message)
      } else if (perfil) {
        const nivelValido = perfil.nivel === 'admin' || perfil.nivel === 'agente'
          ? perfil.nivel
          : null
        setNivel(nivelValido)
        setModulosPermitidos(perfil.modulos_permitidos as Modulo[])
      }
      setCarregando(false)
    }

    carregar()
    return () => { mounted = false }
  }, [])

  const podeAcessar = useCallback((modulo: Modulo): boolean => {
    if (nivel === 'admin') return true
    return modulosPermitidos.includes(modulo)
  }, [nivel, modulosPermitidos])

  return { nivel, modulosPermitidos, podeAcessar, carregando }
}
