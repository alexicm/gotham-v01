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
  qualificacao_socio: string
  codigo_qualificacao_socio: number
  percentual_capital_social: number
  data_entrada_sociedade: string
  cpf_representante_legal: string
  nome_representante_legal: string
  codigo_qualificacao_representante_legal: number | null
  faixa_etaria: string
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
  enriquecida?: boolean   // true após enriquecimento via BrasilAPI/cache Supabase
}

export interface BuscaParams {
  // Params enviados à Lista CNAE API
  cnae?: string                  // string de CNAEs separados por vírgula (ex: "6201500,4530703")
  cnpjs?: string                 // CNPJs separados por vírgula (opcional)
  termosBusca?: string           // termos separados por vírgula (opcional)
  termoBuscaEm?: 'R' | 'F' | 'A' // Razão Social, Fantasia, Ambos (padrão 'A')
  incluirCnaesSecundarios?: boolean
  somenteMatrizes?: boolean
  simplesNacional?: 'ignorar' | 'apenas' | 'excluir'
  mei?: 'ignorar' | 'apenas' | 'excluir'
  capitalSocialMinimo?: number
  capitalSocialMaximo?: number
  telefoneObrigatorio?: boolean
  emailObrigatorio?: boolean
  dataInicio?: string            // ISO date YYYY-MM-DD
  dataFim?: string               // ISO date YYYY-MM-DD
  // Localização
  uf?: string                    // código UF (ex: "SP") — legado, usar ufs
  ufs?: string[]                 // múltiplos estados selecionados (ex: ["SP","RJ"])
  municipio?: string             // texto livre (filtro frontend apenas)
  // Paginação/quantidade
  pagina?: number
  porPagina?: number
  // Filtros frontend (aplicados pós-busca)
  filtroPortes?: string[]        // ex: ['ME', 'EPP']
  filtroSituacoes?: string[]     // ex: ['ATIVA', 'SUSPENSA']
}

export interface BuscaResult {
  empresas: Empresa[]
  total: number
  pagina: number
  ultimaPagina: number
}
