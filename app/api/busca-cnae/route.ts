import { NextRequest, NextResponse } from 'next/server'
import type { Empresa, BuscaResult } from '@/types/empresa'

export const dynamic = 'force-dynamic'

const BASE = 'https://listacnae.com.br/api/v1'

// A API Lista CNAE usa GET com query params JSON-encoded e token no header Authorization.
// Este handler recebe POST do frontend e faz GET para a API externa.
export async function POST(req: NextRequest) {
  const token = process.env.LISTA_CNAE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token não configurado' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const cnaes = body.cnaes as number[] | undefined
  if (!cnaes || cnaes.length === 0) {
    return NextResponse.json({ error: 'Parâmetro cnaes é obrigatório' }, { status: 400 })
  }

  const inicio = Number(body.inicio ?? 0)
  const quantidade = Number(body.quantidade ?? 50)

  // A API usa GET com query params — arrays são passados como JSON strings
  const params = new URLSearchParams()
  params.set('inicio', String(inicio))
  params.set('quantidade', String(quantidade))
  params.set('cnaes', JSON.stringify(cnaes))

  if (body.estados && Array.isArray(body.estados) && (body.estados as unknown[]).length > 0) {
    params.set('estados', JSON.stringify(body.estados))
  }
  if (body.municipios && Array.isArray(body.municipios) && (body.municipios as unknown[]).length > 0) {
    params.set('municipios', JSON.stringify(body.municipios))
  }
  if (body.incluir_cnaes_secundarios) params.set('incluir_cnaes_secundarios', 'true')
  if (body.somente_matrizes) params.set('somente_matrizes', 'true')
  if (body.simples_nacional !== undefined) params.set('simples_nacional', String(body.simples_nacional))
  if (body.mei !== undefined) params.set('mei', String(body.mei))
  if (body.telefone_obrigatorio) params.set('telefone_obrigatorio', 'true')
  if (body.email_obrigatorio) params.set('email_obrigatorio', 'true')
  if (body.capital_social_minimo) params.set('capital_social_minimo', String(body.capital_social_minimo))
  if (body.capital_social_maximo) params.set('capital_social_maximo', String(body.capital_social_maximo))
  if (body.data_inicio) params.set('data_inicio', String(body.data_inicio))
  if (body.data_fim) params.set('data_fim', String(body.data_fim))
  if (body.termos_busca) params.set('termos_busca', JSON.stringify(body.termos_busca))
  if (body.cnpjs) params.set('cnpjs', JSON.stringify(body.cnpjs))

  const url = `${BASE}/buscar?${params.toString()}`
  console.log('[v0] Lista CNAE URL:', url)
  console.log('[v0] Lista CNAE token (primeiros 12):', token.substring(0, 12))

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    const rawText = await res.text()
    console.log('[v0] CNAE API status:', res.status, '| content-type:', res.headers.get('content-type'))
    console.log('[v0] CNAE API raw (primeiros 300):', rawText.substring(0, 300))

    if (!res.ok) {
      return NextResponse.json(
        { error: `Erro da API Lista CNAE: ${res.status}`, detail: rawText },
        { status: res.status }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let raw: any
    try {
      raw = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Resposta da API não é JSON', detail: rawText.substring(0, 500) },
        { status: 502 }
      )
    }

    // A API retorna array direto ou objeto com "empresas"/"data"/"dados"
    const lista: Record<string, unknown>[] = Array.isArray(raw)
      ? raw
      : (raw.empresas ?? raw.dados ?? raw.data ?? [])

    const total: number = Array.isArray(raw)
      ? raw.length
      : (raw.total ?? raw.quantidade_total ?? lista.length)

    const paginaAtual = Math.floor(inicio / quantidade) + 1
    const ultimaPagina = Math.ceil(total / quantidade) || 1

    const empresas: Empresa[] = lista.map((e) => ({
      cnpj: String(e.cnpj ?? ''),
      razaoSocial: String(e.razao_social ?? ''),
      nomeFantasia: String(e.nome_fantasia || e.razao_social || ''),
      cnae: String(e.cnae_principal ?? e.cnae ?? cnaes[0]),
      descricaoCnae: String(e.descricao_cnae ?? e.descricao ?? ''),
      municipio: String(e.municipio ?? ''),
      uf: String(e.uf ?? ''),
      situacao: String(e.situacao ?? 'ATIVA'),
      capitalSocial: Number(e.capital_social ?? 0),
      porte: String(e.porte ?? ''),
      email: e.email ? String(e.email) : undefined,
      telefone: e.telefone ? String(e.telefone) : undefined,
    }))

    const result: BuscaResult = {
      empresas,
      total,
      pagina: paginaAtual,
      ultimaPagina,
    }

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET local: verifica créditos ativos e conectividade com a API
export async function GET() {
  const token = process.env.LISTA_CNAE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token não configurado' }, { status: 500 })
  }

  try {
    const res = await fetch(`${BASE}/creditosAtivos`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json({ error: `API erro ${res.status}`, detail: text }, { status: res.status })
    }
    return NextResponse.json(JSON.parse(text))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
