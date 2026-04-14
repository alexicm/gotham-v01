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
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: `CNPJ não encontrado (${res.status})` },
        { status: res.status }
      )
    }

    const raw: EmpresaBrasilAPI = await res.json()

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
