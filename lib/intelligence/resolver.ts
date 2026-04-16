import { getOpenAI } from './openaiClient'
import { classificarConsulta } from './classifier'
import { buscarGoogleMaps } from './actors/googleMaps'
import { buscarLinkedIn } from './actors/linkedin'
import { rasparSite } from './actors/webCrawler'
import type { Empresa } from '@/types/empresa'
import type {
  RespostaInteligencia,
  PedidoAutorizacao,
  ApifyActor,
  FonteResposta,
} from '@/types/intelligence'

interface ResolverResult {
  resposta: RespostaInteligencia
  pedidoAutorizacao: PedidoAutorizacao | null
}

export async function resolverConsulta(
  pergunta: string,
  empresa: Empresa,
  autorizado: boolean,
): Promise<ResolverResult> {
  const inicio = Date.now()
  const dadosEmpresa = JSON.stringify(empresa, null, 2)

  // PADRÃO: LLM responde tudo usando dados cadastrais + conhecimento geral
  // Apify só é usado quando o usuário solicita explicitamente (autorizado === true)
  if (!autorizado) {
    const resposta = await responderComLLM(pergunta, dadosEmpresa, empresa.cnpj, inicio)
    return { resposta, pedidoAutorizacao: null }
  }

  // APIFY: só executa quando o usuário autorizou explicitamente
  const classificacao = await classificarConsulta(pergunta, dadosEmpresa)

  if (classificacao.actorsNecessarios.length > 0) {
    const dadosExternos: Record<string, unknown> = {}

    for (const actor of classificacao.actorsNecessarios) {
      try {
        const resultado = await executarActor(actor, empresa)
        if (resultado) dadosExternos[actor] = resultado
      } catch (err) {
        console.error(`[intelligence] Actor ${actor} falhou:`, err)
      }
    }

    if (Object.keys(dadosExternos).length > 0) {
      const resposta = await sintetizarComDadosExternos(
        pergunta, dadosEmpresa, dadosExternos, empresa.cnpj, inicio,
      )
      return { resposta, pedidoAutorizacao: null }
    }

    // Todos os actors falharam — fallback LLM com confiança reduzida
    const resposta = await responderComLLM(pergunta, dadosEmpresa, empresa.cnpj, inicio)
    resposta.confianca = 0.5
    return { resposta, pedidoAutorizacao: null }
  }

  // Fallback genérico: LLM direto
  const resposta = await responderComLLM(pergunta, dadosEmpresa, empresa.cnpj, inicio)
  return { resposta, pedidoAutorizacao: null }
}

async function executarActor(
  actor: ApifyActor,
  empresa: Empresa,
): Promise<unknown> {
  const nome = empresa.nomeFantasia || empresa.razaoSocial
  const cidade = empresa.municipio

  switch (actor) {
    case 'google_maps':
      return buscarGoogleMaps(nome, cidade)
    case 'linkedin_company': {
      const dominio = empresa.email?.split('@')[1]
      return buscarLinkedIn(nome, dominio)
    }
    case 'web_crawler': {
      const dominio = empresa.email?.split('@')[1]
      return dominio ? rasparSite(dominio) : null
    }
    case 'google_search':
      return null
  }
}

const SYSTEM_PROMPT = `Você é um analista de inteligência empresarial especializado no mercado brasileiro.
Você tem acesso à internet para buscar informações atualizadas sobre empresas.

INSTRUÇÕES:
- Use os dados cadastrais fornecidos como base factual.
- USE A BUSCA NA WEB para complementar com informações reais e atualizadas: notícias, site da empresa, redes sociais, avaliações, processos judiciais, licitações, etc.
- Sempre que buscar na web, cite as fontes.
- Responda em português, de forma concisa e objetiva.
- Separe claramente: dados cadastrais vs informações encontradas na web vs sua análise.
- Se encontrar informações conflitantes, aponte a divergência.`

async function responderComLLM(
  pergunta: string,
  dadosEmpresa: string,
  cnpj: string,
  inicio: number,
): Promise<RespostaInteligencia> {
  const openai = getOpenAI()

  // Usa a Responses API com web search para acesso à internet
  const response = await openai.responses.create({
    model: 'gpt-4o-mini',
    tools: [{ type: 'web_search_preview' }],
    instructions: SYSTEM_PROMPT,
    input: `DADOS CADASTRAIS DA EMPRESA:\n${dadosEmpresa}\n\nPERGUNTA DO USUÁRIO: ${pergunta}`,
  })

  // Extrair texto da resposta
  let textoResposta = ''
  for (const item of response.output) {
    if (item.type === 'message') {
      for (const block of item.content) {
        if (block.type === 'output_text') {
          textoResposta += block.text
        }
      }
    }
  }

  const usouWeb = response.output.some(
    (item) => item.type === 'web_search_call',
  )

  return {
    id: crypto.randomUUID(),
    cnpj,
    pergunta,
    resposta: textoResposta || 'Não foi possível gerar resposta.',
    confianca: usouWeb ? 0.95 : 0.85,
    fonte: usouWeb ? 'sintetizado' : 'openai',
    tempoMs: Date.now() - inicio,
    criadoEm: new Date().toISOString(),
  }
}

async function sintetizarComDadosExternos(
  pergunta: string,
  dadosEmpresa: string,
  dadosExternos: Record<string, unknown>,
  cnpj: string,
  inicio: number,
): Promise<RespostaInteligencia> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: `Você é um analista de inteligência empresarial. Sintetize dados de múltiplas fontes
para responder perguntas sobre empresas brasileiras. Seja preciso, conciso e cite as fontes dos dados.`,
      },
      {
        role: 'user',
        content: `DADOS CADASTRAIS:\n${dadosEmpresa}\n\nDADOS EXTERNOS:\n${JSON.stringify(dadosExternos, null, 2)}\n\nPERGUNTA: ${pergunta}`,
      },
    ],
  })

  const fontes = Object.keys(dadosExternos)
  let fonte: FonteResposta = 'openai'
  if (fontes.length > 1) fonte = 'sintetizado'
  else if (fontes[0] === 'google_maps') fonte = 'apify_maps'
  else if (fontes[0] === 'linkedin_company') fonte = 'apify_linkedin'
  else if (fontes[0] === 'web_crawler') fonte = 'apify_web'

  return {
    id: crypto.randomUUID(),
    cnpj,
    pergunta,
    resposta: completion.choices[0].message.content ?? 'Não foi possível gerar resposta.',
    confianca: 0.92,
    fonte,
    dadosBrutos: dadosExternos,
    tempoMs: Date.now() - inicio,
    criadoEm: new Date().toISOString(),
  }
}
