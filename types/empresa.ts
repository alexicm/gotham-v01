// Retorno bruto da BrasilAPI /cnpj/v1/{cnpj}
export interface EmpresaBrasilAPI {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  situacao_cadastral: number
  descricao_situacao_cadastral: string
  data_situacao_cadastral: string
  natureza_juridica: string
  codigo_natureza_juridica: number
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cep: string
  municipio: string
  uf: string
  email: string
  telefone: string
  ente_federativo_responsavel: string
  capital_social: number
  porte: string
  opcao_pelo_simples: boolean
  data_opcao_pelo_simples: string | null
  opcao_pelo_mei: boolean
  data_inicio_atividade: string
  cnae_fiscal: number
  cnae_fiscal_descricao: string
  cnaes_secundarios: { codigo: number; descricao: string }[]
  qsa: Socio[]
}

export interface Socio {
  identificador_de_socio: number
  nome_socio: string
  cnpj_cpf_do_socio: string
  codigo_qualificacao_socio: number
  percentual_capital_social: number
  data_entrada_sociedade: string
  cpf_representante_legal: string
  nome_representante_legal: string
  codigo_qualificacao_representante_legal: number | null
  faixa_etaria: string
}

// Retorno da Lista CNAE API
export interface EmpresaListaCNAE {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  cnae_principal: string
  descricao_cnae: string
  municipio: string
  uf: string
  situacao: string
  capital_social: number
  porte: string
  email?: string
  telefone?: string
}

export interface ListaCNAEResponse {
  dados: EmpresaListaCNAE[]
  total: number
  pagina: number
  por_pagina: number
  ultima_pagina: number
}

// Empresa normalizada para uso interno
export interface Empresa {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  cnae: string
  descricaoCnae: string
  municipio: string
  uf: string
  situacao: string
  capitalSocial: number
  porte: string
  email?: string
  telefone?: string
  // campos extras da ficha completa
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  dataInicio?: string
  naturezaJuridica?: string
  optanteSimples?: boolean
  optanteMei?: boolean
  cnaesSecundarios?: { codigo: number; descricao: string }[]
  socios?: Socio[]
}

export interface BuscaParams {
  cnae?: string
  uf?: string
  municipio?: string
  porte?: string
  situacao?: string
  pagina?: number
  porPagina?: number
}

export interface BuscaResult {
  empresas: Empresa[]
  total: number
  pagina: number
  ultimaPagina: number
}
