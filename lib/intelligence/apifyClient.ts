import { ApifyClient } from 'apify-client'
import type { ApifyActor } from '@/types/intelligence'

let _client: ApifyClient | null = null

export function getApifyClient(): ApifyClient {
  if (!_client) {
    const token = process.env.APIFY_API_TOKEN
    if (!token) throw new Error('APIFY_API_TOKEN não configurado')
    _client = new ApifyClient({ token })
  }
  return _client
}

export const ACTOR_IDS: Record<ApifyActor, string> = {
  google_maps: 'compass/crawler-google-places',
  linkedin_company: 'curious_coder/linkedin-company-scraper',
  web_crawler: 'apify/website-content-crawler',
  google_search: 'apify/google-search-scraper',
}

export const CUSTO_ESTIMADO: Record<ApifyActor, number> = {
  google_maps: 0.08,
  linkedin_company: 0.12,
  web_crawler: 0.06,
  google_search: 0.04,
}

export const TEMPO_ESTIMADO: Record<ApifyActor, number> = {
  google_maps: 10,
  linkedin_company: 15,
  web_crawler: 8,
  google_search: 5,
}
