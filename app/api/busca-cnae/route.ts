import { NextRequest, NextResponse } from 'next/server'
import type { Empresa, BuscaResult } from '@/types/empresa'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// URL confirmada por teste direto: api.listacnae.com.br/v1 retorna JSON real
const BASE = 'https://api.listacnae.com.br/v1'

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

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const rawText = await res.text()

    let raw: Record<string, unknown>
    try {
      raw = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Resposta inesperada da API Lista CNAE', detail: rawText.substring(0, 300) },
        { status: 502 }
      )
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: String(raw.mensagem ?? `Erro ${res.status}`) },
        { status: res.status }
      )
    }

    // Campos confirmados pelo teste direto:
    // quantidade_encontrada, quantidade_retornada, dados (array de empresas)
    const lista: Record<string, unknown>[] =
      (raw.dados as Record<string, unknown>[]) ??
      (raw.empresas as Record<string, unknown>[]) ??
      (raw.data as Record<string, unknown>[]) ??
      []

    const totalEncontrado = Number(raw.quantidade_encontrada ?? raw.total ?? lista.length)
    const paginaAtual = Math.floor(inicio / quantidade) + 1
    const ultimaPagina = Math.ceil(totalEncontrado / quantidade) || 1

    const empresas: Empresa[] = lista.map((e) => {
      const endereco = e.endereco as Record<string, unknown> | undefined
      const capitalRaw = String(e.capital_social ?? '0').replace(',', '.').replace(/[^\d.]/g, '')
      const ddd1 = e.telefone_ddd_1 ? String(e.telefone_ddd_1) : ''
      const num1 = e.telefone_numero_1 ? String(e.telefone_numero_1) : ''
      const telefone = ddd1 && num1 ? `(${ddd1}) ${num1}` : num1 || undefined
      const dataInicio = (e.inicio_atividade as Record<string, unknown> | undefined)?.formato_date
        ? String((e.inicio_atividade as Record<string, unknown>).formato_date).substring(0, 10)
        : undefined

      return {
        cnpj:          String(e.cnpj ?? '').replace(/\D/g, ''),
        razaoSocial:   String(e.razao_social ?? ''),
        nomeFantasia:  String(e.nome_fantasia || (e.razao_social ?? '')),
        cnae:          String(e.cnae_primario ?? cnaes[0] ?? ''),
        descricaoCnae: '',
        municipio:     String(endereco?.municipio ?? ''),
        uf:            String(endereco?.uf ?? ''),
        situacao:      String(e.situacao ?? 'ATIVA'),
        capitalSocial: parseFloat(capitalRaw) || 0,
        porte:         String(e.porte ?? ''),
        email:         e.email ? String(e.email) : undefined,
        telefone,
        logradouro:    endereco ? [endereco.tipo, endereco.logradouro].filter(Boolean).join(' ') : undefined,
        numero:        endereco?.numero ? String(endereco.numero) : undefined,
        complemento:   endereco?.complemento ? String(endereco.complemento).trim() || undefined : undefined,
        bairro:        endereco?.bairro ? String(endereco.bairro) : undefined,
        cep:           endereco?.cep ? String(endereco.cep) : undefined,
        dataInicio,
        naturezaJuridica: e.natureza_juridica_descricao ? String(e.natureza_juridica_descricao) : undefined,
        optanteSimples: e.simples != null ? Boolean(e.simples) : undefined,
        optanteMei:    e.mei != null ? Boolean(e.mei) : undefined,
      }
    })

    const result: BuscaResult = {
      empresas,
      total: totalEncontrado,
      pagina: paginaAtual,
      ultimaPagina,
    }

    // Gravar histórico em background (não bloqueia a resposta)
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const adminClient = await createAdminClient()
        await adminClient.from('historico_buscas').insert({
          usuario_id: user.id,
          cnaes: cnaes.map(String),
          params: body,
          total_resultados: result.total,
        })
      }
    } catch { /* falha silenciosa — não prejudica a busca */ }

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
      cache: 'no-store',
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
