export type TipoConsulta =
  | 'factual_estatico'
  | 'analise_contexto'
  | 'presenca_digital'
  | 'social_realtime'
  | 'hibrido'

export type FonteResposta =
  | 'cache'
  | 'brasilapi'
  | 'openai'
  | 'apify_maps'
  | 'apify_linkedin'
  | 'apify_web'
  | 'apify_search'
  | 'sintetizado'

export type ApifyActor =
  | 'google_maps'
  | 'linkedin_company'
  | 'web_crawler'
  | 'google_search'

export interface CustoEstimado {
  actor: ApifyActor
  creditosEstimados: number
  tempoEstimadoS: number
  descricao: string
}

export interface PedidoAutorizacao {
  id: string
  cnpj: string
  razaoSocial: string
  pergunta: string
  custos: CustoEstimado[]
  custoTotalEstimado: number
  status: 'pendente' | 'autorizado' | 'recusado'
  criadoEm: string
}

export interface RespostaInteligencia {
  id: string
  cnpj: string
  pergunta: string
  resposta: string
  confianca: number
  fonte: FonteResposta
  dadosBrutos?: Record<string, unknown>
  custoReal?: number
  tempoMs: number
  criadoEm: string
}

export interface ConsultaInteligencia {
  id: string
  cnpj: string
  empresaNome: string
  pergunta: string
  tipo: TipoConsulta
  status: 'classificando' | 'resolvendo' | 'aguardando_auth' | 'concluido' | 'erro'
  pedidoAutorizacao?: PedidoAutorizacao
  resposta?: RespostaInteligencia
  criadoEm: string
}
