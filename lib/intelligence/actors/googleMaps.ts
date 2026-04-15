import { getApifyClient, ACTOR_IDS } from '../apifyClient'

export interface GoogleMapsResult {
  nome: string
  endereco: string
  telefone: string | null
  website: string | null
  nota: number | null
  totalReviews: number
  categorias: string[]
  horarios: Record<string, string>
  estaAberto: boolean | null
  fotosCount: number
}

export async function buscarGoogleMaps(
  query: string,
  cidade: string,
  maxResultados = 1,
): Promise<GoogleMapsResult | null> {
  const client = getApifyClient()

  const run = await client.actor(ACTOR_IDS.google_maps).call({
    searchStringsArray: [`${query} ${cidade}`],
    maxCrawledPlacesPerSearch: maxResultados,
    language: 'pt',
    countryCode: 'BR',
    includeReviews: false,
    includeImages: false,
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  if (!items.length) return null

  const item = items[0] as Record<string, unknown>
  return {
    nome: String(item.title ?? ''),
    endereco: String(item.address ?? ''),
    telefone: item.phone ? String(item.phone) : null,
    website: item.website ? String(item.website) : null,
    nota: item.totalScore ? Number(item.totalScore) : null,
    totalReviews: Number(item.reviewsCount ?? 0),
    categorias: Array.isArray(item.categories) ? (item.categories as string[]) : [],
    horarios: (item.openingHours as Record<string, string>) ?? {},
    estaAberto: item.isOpen != null ? Boolean(item.isOpen) : null,
    fotosCount: Number(item.photosCount ?? 0),
  }
}
