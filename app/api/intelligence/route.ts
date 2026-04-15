import { NextRequest, NextResponse } from 'next/server'
import { resolverConsulta } from '@/lib/intelligence/resolver'
import type { Empresa } from '@/types/empresa'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      pergunta,
      empresa,
      autorizado,
    }: {
      pergunta: string
      empresa: Empresa
      autorizado: boolean
    } = body

    if (!pergunta?.trim()) {
      return NextResponse.json(
        { error: 'Pergunta é obrigatória' },
        { status: 400 },
      )
    }
    if (!empresa?.cnpj) {
      return NextResponse.json(
        { error: 'Empresa é obrigatória' },
        { status: 400 },
      )
    }

    const resultado = await resolverConsulta(
      pergunta.trim(),
      empresa,
      autorizado ?? false,
    )

    return NextResponse.json({
      resposta: resultado.resposta,
      pedidoAutorizacao: resultado.pedidoAutorizacao,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[intelligence] route error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
