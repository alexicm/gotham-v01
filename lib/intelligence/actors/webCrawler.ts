import { getApifyClient, ACTOR_IDS } from '../apifyClient'

export interface WebCrawlerResult {
  url: string
  titulo: string
  descricaoMeta: string | null
  conteudoMarkdown: string
  emailsEncontrados: string[]
  telefonesEncontrados: string[]
}

export async function rasparSite(url: string): Promise<WebCrawlerResult | null> {
  const urlFinal = url.startsWith('http') ? url : `https://${url}`
  const client = getApifyClient()

  const run = await client.actor(ACTOR_IDS.web_crawler).call({
    startUrls: [{ url: urlFinal }],
    maxCrawlPages: 3,
    maxCrawlDepth: 1,
    outputFormats: ['markdown'],
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  if (!items.length) return null

  const item = items[0] as Record<string, unknown>
  const texto = String(item.markdown ?? item.text ?? '')

  const emails = [
    ...new Set(
      texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [],
    ),
  ]
  const telefones = [
    ...new Set(
      texto.match(/(\(?\d{2}\)?\s?)?(\d{4,5}[-\s]?\d{4})/g) ?? [],
    ),
  ]

  return {
    url: urlFinal,
    titulo: String(item.title ?? ''),
    descricaoMeta: item.description ? String(item.description) : null,
    conteudoMarkdown: texto.slice(0, 3000),
    emailsEncontrados: emails.slice(0, 5),
    telefonesEncontrados: telefones.slice(0, 5),
  }
}
