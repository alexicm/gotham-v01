# Módulo de Inteligência Avançada — Sub-projeto A: Backend

**Data:** 2026-04-15
**Status:** Aprovado

---

## Problema

O sistema Gotham Search tem dados cadastrais de empresas (Receita Federal, Lista CNAE), mas não consegue responder perguntas analíticas, buscar presença digital ou obter dados em tempo real de fontes como Google Maps e LinkedIn.

---

## Solução

Orquestrador com 3 camadas de resolução:

1. **Cache/LLM direto** — perguntas sobre dados cadastrais existentes. Resposta via gpt-4o-mini usando os campos da `Empresa`. Sem custo Apify.
2. **Gate de autorização** — quando a resposta requer dados externos (Apify), o sistema pausa e retorna uma estimativa de custo. O frontend decide se autoriza.
3. **Apify + síntese LLM** — executa actors Apify autorizados, coleta dados, sintetiza resposta com gpt-4o.

---

## Arquivos a criar

Nenhum arquivo existente é modificado neste sub-projeto.

```
types/intelligence.ts
lib/intelligence/openaiClient.ts
lib/intelligence/apifyClient.ts
lib/intelligence/classifier.ts
lib/intelligence/actors/googleMaps.ts
lib/intelligence/actors/linkedin.ts
lib/intelligence/actors/webCrawler.ts
lib/intelligence/resolver.ts
app/api/intelligence/route.ts
```

---

## Dependências

```bash
pnpm add apify-client openai
```

---

## Variáveis de ambiente

Server-side only (sem prefixo `NEXT_PUBLIC_`):

```
APIFY_API_TOKEN=...
OPENAI_API_KEY=...
```

Adicionadas ao `.env.local` do desenvolvedor. Nunca commitadas.

---

## Tipos (`types/intelligence.ts`)

### TipoConsulta
- `factual_estatico` — dados cadastrais → LLM responde direto
- `analise_contexto` — análise/síntese → LLM responde direto
- `presenca_digital` — avaliações, Google Maps, site → requer Apify
- `social_realtime` — LinkedIn, posts → requer Apify
- `hibrido` — LLM + Apify juntos

### FonteResposta
`cache` | `brasilapi` | `openai` | `apify_maps` | `apify_linkedin` | `apify_web` | `apify_search` | `sintetizado`

### ApifyActor
`google_maps` | `linkedin_company` | `web_crawler` | `google_search`

### CustoEstimado
- `actor: ApifyActor`
- `creditos_estimados: number`
- `tempo_estimado_s: number`
- `descricao: string`

### PedidoAutorizacao
- `id: string` (crypto.randomUUID)
- `cnpj: string`
- `razaoSocial: string`
- `pergunta: string`
- `custos: CustoEstimado[]`
- `custoTotalEstimado: number`
- `status: 'pendente' | 'autorizado' | 'recusado'`
- `criadoEm: string`

### RespostaInteligencia
- `id: string`
- `cnpj: string`
- `pergunta: string`
- `resposta: string`
- `confianca: number` (0.0–1.0)
- `fonte: FonteResposta`
- `dadosBrutos?: Record<string, unknown>` (payload original do Apify)
- `custoReal?: number`
- `tempoMs: number`
- `criadoEm: string`

### ConsultaInteligencia
- `id: string`
- `cnpj: string`
- `empresaNome: string`
- `pergunta: string`
- `tipo: TipoConsulta`
- `status: 'classificando' | 'resolvendo' | 'aguardando_auth' | 'concluido' | 'erro'`
- `pedidoAutorizacao?: PedidoAutorizacao`
- `resposta?: RespostaInteligencia`
- `criadoEm: string`

Nomes em camelCase para consistência com `Empresa` existente.

---

## Clientes (`lib/intelligence/`)

### openaiClient.ts
Singleton. `getOpenAI()` retorna instância do `OpenAI` configurada com `process.env.OPENAI_API_KEY`. Erro claro se não configurado.

### apifyClient.ts
Singleton. `getApifyClient()` retorna instância do `ApifyClient` configurada com `process.env.APIFY_API_TOKEN`.

Constantes exportadas:
- `ACTOR_IDS` — mapa de `ApifyActor` para IDs do Apify Store
- `CUSTO_ESTIMADO` — mapa de `ApifyActor` para créditos estimados por execução

IDs dos actors (verificar em apify.com/store antes de implementar):
- `google_maps`: `compass/crawler-google-places`
- `linkedin_company`: `curious_coder/linkedin-company-scraper`
- `web_crawler`: `apify/website-content-crawler`
- `google_search`: `apify/google-search-scraper`

---

## Classifier (`lib/intelligence/classifier.ts`)

Recebe `pergunta: string` + `dadosEmpresa: string` (JSON da `Empresa` serializada).

Chama gpt-4o-mini com temperature 0, max_tokens 300. System prompt instrui o modelo a classificar em uma das 5 categorias e retornar JSON com:
- `tipo: TipoConsulta`
- `confianca_llm: number` (0.0–1.0)
- `actors_necessarios: ApifyActor[]`
- `raciocinio: string`

Retorna `ClassificacaoResult` com custos estimados calculados a partir do mapa `CUSTO_ESTIMADO`.

---

## Actors (`lib/intelligence/actors/`)

Cada actor é uma função que recebe parâmetros da empresa e retorna um resultado tipado ou `null`.

### googleMaps.ts — `buscarGoogleMaps(query, cidade, maxResultados?)`
Retorna: nome, endereco, telefone, website, nota (1-5), totalReviews, categorias, horarios, estaAberto, fotosCount.

### linkedin.ts — `buscarLinkedIn(nomeEmpresa, website?)`
Retorna: nome, descricao, website, setor, tamanhoEmpresa, funcionariosEstimado, sede, fundadaEm, seguidores, postsRecentes (top 3), estaContratando.

### webCrawler.ts — `rasparSite(url)`
Raspa até 3 páginas (home + sobre + contato). Extrai emails e telefones do conteúdo via regex.
Retorna: url, titulo, descricaoMeta, conteudoMarkdown (truncado 3000 chars), tecnologias, emailsEncontrados, telefonesEncontrados.

---

## Resolver (`lib/intelligence/resolver.ts`)

Função principal: `resolverConsulta(pergunta, empresa, autorizado)`

Fluxo:
1. Serializa `Empresa` para JSON
2. Chama `classificarConsulta(pergunta, dadosJSON)`
3. Se `confianca_llm >= 0.85` e zero actors → responde com gpt-4o-mini direto
4. Se actors necessários e `autorizado === false` → retorna resposta parcial + `PedidoAutorizacao`
5. Se actors necessários e `autorizado === true` → executa actors em sequência, sintetiza com gpt-4o

Degradação: se um actor falha, continua com os demais. Se todos falham, cai para resposta LLM-only com confiança reduzida (0.5).

Modelos:
- Classificação: gpt-4o-mini (barato, ~$0.00015/1k tokens)
- Resposta direta: gpt-4o-mini
- Síntese com dados externos: gpt-4o (mais capaz)

---

## API Route (`app/api/intelligence/route.ts`)

`POST /api/intelligence`

Body:
```json
{
  "pergunta": "Qual a nota no Google Maps?",
  "empresa": { ...Empresa },
  "autorizado": false
}
```

Resposta:
```json
{
  "resposta": { ...RespostaInteligencia },
  "pedidoAutorizacao": { ...PedidoAutorizacao } | null
}
```

Síncrona. Sem SSE, sem polling. Validação: `pergunta` não vazio, `empresa.cnpj` presente.

---

## Degradação e erros

- Variável de ambiente ausente → erro 500 com mensagem clara
- Actor Apify falha → continua com os demais, resposta com confiança reduzida
- Todos os actors falham → fallback para resposta LLM-only
- OpenAI falha → erro 500 propagado ao frontend
- JSON inválido do LLM na classificação → tenta parse com limpeza de markdown fences, se falha → erro

---

## Fora do escopo (Sub-projeto A)

- Componentes React / UI
- Integração no desktop OS
- Persistência no Supabase
- SSE / streaming de respostas
- Actor `google_search` (estrutura criada mas implementação simplificada — retorna null)
- Histórico de consultas em banco
