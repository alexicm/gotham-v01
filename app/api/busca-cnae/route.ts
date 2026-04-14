import { NextRequest, NextResponse } from 'next/server'
import type { Empresa, ListaCNAEResponse } from '@/types/empresa'

const BASE = 'https://listacnae.com.br/api/v1'

export async function GET(req: NextRequest) {
  const token = process.env.LISTA_CNAE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token não configurado' }, { status: 500 })
  }

  const { searchParams } = req.nextUrl
  const cnae = searchParams.get('cnae') ?? ''
  const uf = searchParams.get('uf') ?? ''
  const municipio = searchParams.get('municipio') ?? ''
  const porte = searchParams.get('porte') ?? ''
  const situacao = searchParams.get('situacao') ?? ''
  const pagina = searchParams.get('pagina') ?? '1'
  const porPagina = searchParams.get('porPagina') ?? '50'

  if (!cnae) {
    return NextResponse.json({ error: 'Parâmetro cnae é obrigatório' }, { status: 400 })
  }

  const params = new URLSearchParams()
  params.set('token', token)
  params.set('cnae', cnae)
  params.set('pagina', pagina)
  params.set('registros_por_pagina', porPagina)
  if (uf) params.set('uf', uf)
  if (municipio) params.set('municipio', municipio)
  if (porte) params.set('porte', porte)
  if (situacao) params.set('situacao', situacao)

  try {
    const url = `${BASE}/empresas?${params.toString()}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Erro da API Lista CNAE: ${res.status}`, detail: text },
        { status: res.status }
      )
    }

    const raw: ListaCNAEResponse = await res.json()

    // Normalizar para o formato interno Empresa
    const empresas: Empresa[] = (raw.dados ?? []).map((e) => ({
      cnpj: e.cnpj,
      razaoSocial: e.razao_social,
      nomeFantasia: e.nome_fantasia || e.razao_social,
      cnae: e.cnae_principal,
      descricaoCnae: e.descricao_cnae,
      municipio: e.municipio,
      uf: e.uf,
      situacao: e.situacao,
      capitalSocial: e.capital_social ?? 0,
      porte: e.porte,
      email: e.email,
      telefone: e.telefone,
    }))

    return NextResponse.json({
      empresas,
      total: raw.total,
      pagina: raw.pagina,
      ultimaPagina: raw.ultima_pagina,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
