import { getApifyClient, ACTOR_IDS } from '../apifyClient'

export interface LinkedInResult {
  nome: string
  descricao: string | null
  website: string | null
  setor: string | null
  tamanhoEmpresa: string | null
  funcionariosEstimado: number | null
  sede: string | null
  fundadaEm: number | null
  seguidores: number | null
  postsRecentes: Array<{
    texto: string
    data: string
    likes: number
  }>
  estaContratando: boolean
}

export async function buscarLinkedIn(
  nomeEmpresa: string,
  website?: string | null,
): Promise<LinkedInResult | null> {
  const client = getApifyClient()

  const input: Record<string, unknown> = {
    searchTerms: [nomeEmpresa],
    maxResults: 1,
  }
  if (website) input.websites = [website]

  const run = await client.actor(ACTOR_IDS.linkedin_company).call(input)
  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  if (!items.length) return null

  const item = items[0] as Record<string, unknown>
  const posts = Array.isArray(item.posts)
    ? (item.posts as Record<string, unknown>[]).slice(0, 3)
    : []

  return {
    nome: String(item.name ?? ''),
    descricao: item.description ? String(item.description) : null,
    website: item.website ? String(item.website) : null,
    setor: item.industry ? String(item.industry) : null,
    tamanhoEmpresa: item.companySize ? String(item.companySize) : null,
    funcionariosEstimado: item.employeeCount ? Number(item.employeeCount) : null,
    sede: item.headquartersLocation ? String(item.headquartersLocation) : null,
    fundadaEm: item.founded ? Number(item.founded) : null,
    seguidores: item.followersCount ? Number(item.followersCount) : null,
    postsRecentes: posts.map((p) => ({
      texto: String(p.text ?? '').slice(0, 200),
      data: String(p.postedAt ?? ''),
      likes: Number(p.likesCount ?? 0),
    })),
    estaContratando: Boolean(item.isHiring ?? false),
  }
}
