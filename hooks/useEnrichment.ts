'use client'

import { useState, useCallback, useRef } from 'react'
import type { Empresa } from '@/types/empresa'

const BATCH_SIZE = 10

export function useEnrichment() {
  const [enrichedMap, setEnrichedMap] = useState<Map<string, Empresa>>(new Map())
  const [enrichingCnpjs, setEnrichingCnpjs] = useState<Set<string>>(new Set())
  const cancelRef = useRef(false)

  const enrich = useCallback(async (empresas: Empresa[]) => {
    cancelRef.current = true
    await new Promise(r => setTimeout(r, 0))
    cancelRef.current = false

    setEnrichedMap(new Map())
    setEnrichingCnpjs(new Set())

    const todo = empresas.filter(e => !e.enriquecida)
    if (todo.length === 0) return

    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
      if (cancelRef.current) return

      const batch = todo.slice(i, i + BATCH_SIZE)

      setEnrichingCnpjs(prev => {
        const next = new Set(prev)
        batch.forEach(e => next.add(e.cnpj))
        return next
      })

      await Promise.all(
        batch.map(async (empresa) => {
          if (cancelRef.current) return
          try {
            const digits = empresa.cnpj.replace(/\D/g, '')
            const res = await fetch(`/api/cnpj/${digits}`)
            if (res.ok && !cancelRef.current) {
              const data: Empresa = await res.json()
              data.enriquecida = true
              setEnrichedMap(prev => new Map(prev).set(empresa.cnpj, data))
            }
          } catch {
            // falha silenciosa
          } finally {
            if (!cancelRef.current) {
              setEnrichingCnpjs(prev => {
                const next = new Set(prev)
                next.delete(empresa.cnpj)
                return next
              })
            }
          }
        })
      )
    }
  }, [])

  return { enrich, enrichedMap, enrichingCnpjs }
}
