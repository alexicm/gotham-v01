import { NextRequest, NextResponse } from 'next/server'
import type { Empresa, BuscaResult } from '@/types/empresa'

const BASE = 'https://listacnae.com.br/api/v1'

// Lista CNAE usa POST com body JSON e token no header
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

  // Validação mínima: ao menos um CNAE deve ser enviado
  const cnaes = body.cnaes as number[] | undefined
  if (!cnaes || cnaes.length === 0) {
    return NextResponse.json({ error: 'Parâmetro cnaes é obrigatório' }, { status: 400 })
  }

  const inicio = (body.inicio as number) ?? 0
  const quantidade = (body.quantidade as number) ?? 50

  // Monta payload para a API
  const payload: Record<string, unknown> = {
    inicio,
    quantidade,
    cnaes,
    incluir_cnaes_secundarios: body.incluir_cnaes_secundarios ?? false,
    somente_matrizes: body.somente_matrizes ?? false,
  }

  if (body.estados) payload.estados = body.estados
  if (body.municipios) payload.municipios = body.municipios
  if (body.simples_nacional !== undefined) payload.simples_nacional = body.simples_nacional
  if (body.mei !== undefined) payload.mei = body.mei
  if (body.telefone_obrigatorio) payload.telefone_obrigatorio = body.telefone_obrigatorio
  if (body.email_obrigatorio) payload.email_obrigatorio = body.email_obrigatorio
  if (body.capital_social_minimo) payload.capital_social_minimo = body.capital_social_minimo
  if (body.capital_social_maximo) payload.capital_social_maximo = body.capital_social_maximo
  if (body.data_inicio) payload.data_inicio = body.data_inicio
  if (body.data_fim) payload.data_fim = body.data_fim
  if (body.termos_busca) payload.termos_busca = body.termos_busca

  try {
    const res = await fetch(`${BASE}/buscar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const rawText = await res.text()

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
      return NextResponse.json({ error: 'Resposta da API não é JSON', detail: rawText.substring(0, 500) }, { status: 502 })
    }

    // A API retorna array direto ou objeto com propriedade "empresas"/"dados"
    const lista = Array.isArray(raw)
      ? raw
      : (raw.empresas ?? raw.dados ?? raw.data ?? [])

    const total: number = Array.isArray(raw)
      ? raw.length
      : (raw.total ?? raw.quantidade_total ?? lista.length)

    const paginaAtual = Math.floor(inicio / quantidade) + 1
    const ultimaPagina = Math.ceil(total / quantidade) || 1

    const empresas: Empresa[] = lista.map((e: Record<string, string | number>) => ({
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

// Mantém GET para listar créditos e verificar conectividade
export async function GET() {
  const token = process.env.LISTA_CNAE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token não configurado' }, { status: 500 })
  }

  try {
    const res = await fetch(`${BASE}/creditosAtivos`, {
      headers: { Authorization: `Bearer ${token}` },
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
