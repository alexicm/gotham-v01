import { NextRequest, NextResponse } from 'next/server'
import type { EmpresaBrasilAPI, Empresa } from '@/types/empresa'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await params
  const digits = cnpj.replace(/\D/g, '')

  if (digits.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GothamSearch/1.0 (+https://gotham-search.vercel.app)',
        },
        cache: 'no-store',
      }
    )

    const rawText = await res.text()

    if (!res.ok) {
      // 429 = rate limit, 403 = bloqueado — tenta via API alternativa
      if (res.status === 403 || res.status === 429) {
        const alt = await fetch(
          `https://receitaws.com.br/v1/cnpj/${digits}`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'GothamSearch/1.0',
            },
            cache: 'no-store',
          }
        )
        if (alt.ok) {
          const altRaw = await alt.json()
          // receitaws usa campos ligeiramente diferentes
          const empresa: Empresa = {
            cnpj: digits,
            razaoSocial: altRaw.nome ?? '',
            nomeFantasia: altRaw.fantasia || altRaw.nome || '',
            cnae: altRaw.atividade_principal?.[0]?.code?.replace(/[.\-\/]/g, '') ?? '',
            descricaoCnae: altRaw.atividade_principal?.[0]?.text ?? '',
            municipio: altRaw.municipio ?? '',
            uf: altRaw.uf ?? '',
            situacao: altRaw.situacao ?? '',
            capitalSocial: parseFloat(String(altRaw.capital_social ?? '0').replace(/\D/g, '')) || 0,
            porte: altRaw.porte ?? '',
            email: altRaw.email,
            telefone: altRaw.telefone,
            logradouro: altRaw.logradouro,
            numero: altRaw.numero,
            complemento: altRaw.complemento,
            bairro: altRaw.bairro,
            cep: altRaw.cep,
            dataInicio: altRaw.abertura,
            naturezaJuridica: altRaw.natureza_juridica,
            socios: altRaw.qsa,
          }
          return NextResponse.json(empresa)
        }
      }
      return NextResponse.json(
        { error: `CNPJ não encontrado (${res.status})` },
        { status: res.status }
      )
    }

    let raw: EmpresaBrasilAPI
    try {
      raw = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'Resposta inválida da API' }, { status: 502 })
    }

    const empresa: Empresa = {
      cnpj: raw.cnpj,
      razaoSocial: raw.razao_social,
      nomeFantasia: raw.nome_fantasia || raw.razao_social,
      cnae: String(raw.cnae_fiscal),
      descricaoCnae: raw.cnae_fiscal_descricao,
      municipio: raw.municipio,
      uf: raw.uf,
      situacao: raw.descricao_situacao_cadastral,
      capitalSocial: raw.capital_social,
      porte: raw.porte,
      email: raw.email,
      telefone: raw.telefone,
      logradouro: raw.logradouro,
      numero: raw.numero,
      complemento: raw.complemento,
      bairro: raw.bairro,
      cep: raw.cep,
      dataInicio: raw.data_inicio_atividade,
      naturezaJuridica: raw.natureza_juridica,
      optanteSimples: raw.opcao_pelo_simples,
      optanteMei: raw.opcao_pelo_mei,
      cnaesSecundarios: raw.cnaes_secundarios,
      socios: raw.qsa,
    }

    return NextResponse.json(empresa)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
