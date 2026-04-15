import { getOpenAI } from './openaiClient'
import { CUSTO_ESTIMADO, TEMPO_ESTIMADO } from './apifyClient'
import type { TipoConsulta, CustoEstimado, ApifyActor } from '@/types/intelligence'

export interface ClassificacaoResult {
  tipo: TipoConsulta
  confiancaLlm: number
  actorsNecessarios: ApifyActor[]
  custosEstimados: CustoEstimado[]
  raciocinio: string
}

const SYSTEM_PROMPT = `Você é um classificador de consultas sobre empresas brasileiras.
Classifique cada pergunta em uma das categorias abaixo e determine se você consegue responder
diretamente com os dados fornecidos ou se precisa de buscas externas.

CATEGORIAS:
- factual_estatico: dados cadastrais (CNPJ, sócios, endereço, CNAE). Você responde com dados fornecidos.
- analise_contexto: análise, síntese, comparação, tendências de setor. Você responde com raciocínio.
- presenca_digital: avaliações Google, site da empresa, nota Maps, horários. REQUER Apify.
- social_realtime: LinkedIn, equipe, contratações, posts recentes. REQUER Apify.
- hibrido: precisa de análise + dados reais da web. REQUER LLM + Apify.

ACTORS DISPONÍVEIS:
- google_maps: busca no Google Maps (nota, avaliações, horários, telefone, site)
- linkedin_company: perfil LinkedIn (funcionários, contratações, posts)
- web_crawler: raspa site da empresa (conteúdo, emails, telefones)
- google_search: pesquisa Google genérica

Responda SOMENTE com JSON válido no formato:
{
  "tipo": "...",
  "confianca_llm": 0.0,
  "actors_necessarios": [],
  "raciocinio": "..."
}`

export async function classificarConsulta(
  pergunta: string,
  dadosEmpresa: string,
): Promise<ClassificacaoResult> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `DADOS DA EMPRESA:\n${dadosEmpresa}\n\nPERGUNTA: ${pergunta}`,
      },
    ],
  })

  const raw = completion.choices[0].message.content ?? '{}'
  const cleaned = raw.replace(/```json|```/g, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return {
      tipo: 'analise_contexto',
      confiancaLlm: 0.7,
      actorsNecessarios: [],
      custosEstimados: [],
      raciocinio: 'Falha ao parsear classificação — fallback para análise LLM',
    }
  }

  const actors: ApifyActor[] = Array.isArray(parsed.actors_necessarios)
    ? (parsed.actors_necessarios as string[]).filter(
        (a): a is ApifyActor =>
          ['google_maps', 'linkedin_company', 'web_crawler', 'google_search'].includes(a),
      )
    : []

  const custos: CustoEstimado[] = actors.map((actor) => ({
    actor,
    creditosEstimados: CUSTO_ESTIMADO[actor] ?? 0.1,
    tempoEstimadoS: TEMPO_ESTIMADO[actor] ?? 10,
    descricao: getDescricaoActor(actor, dadosEmpresa),
  }))

  return {
    tipo: (parsed.tipo as TipoConsulta) ?? 'analise_contexto',
    confiancaLlm: Number(parsed.confianca_llm ?? 0),
    actorsNecessarios: actors,
    custosEstimados: custos,
    raciocinio: String(parsed.raciocinio ?? ''),
  }
}

function getDescricaoActor(actor: ApifyActor, dadosEmpresa: string): string {
  try {
    const dados = JSON.parse(dadosEmpresa)
    const nome = dados.nomeFantasia || dados.razaoSocial || 'empresa'
    const cidade = dados.municipio ?? ''
    const map: Record<ApifyActor, string> = {
      google_maps: `Busca no Google Maps por "${nome} ${cidade}"`,
      linkedin_company: `Perfil LinkedIn de "${nome}"`,
      web_crawler: `Rastreamento do site de "${nome}"`,
      google_search: `Pesquisa Google por "${nome}"`,
    }
    return map[actor] ?? actor
  } catch {
    return actor
  }
}
