# Design: Melhorias de UX — Busca, Filtros e Enriquecimento CNPJ

**Data:** 2026-04-15  
**Status:** Aprovado pelo usuário  
**Escopo:** BuscaWindow, ResultadosWindow, FichaWindow, API route busca-cnae, API route cnpj

---

## 1. Contexto

O Gotham Search é uma plataforma de inteligência empresarial que permite buscar empresas brasileiras por CNAE via a API Lista CNAE. Atualmente a janela de busca expõe apenas 4 filtros (CNAE, UF, município, porte) e a tabela de resultados não abre a ficha da empresa ao clicar na linha. O objetivo é expandir os filtros disponíveis, reorganizar a UX com abas, enriquecer os resultados com dados completos da BrasilAPI e habilitar a abertura da FichaWindow a partir da tabela.

---

## 2. Funcionalidades

### 2.1 BuscaWindow — Filtros em Abas

A janela de busca passa a ter **4 abas**, cada uma agrupando filtros relacionados.

#### Aba 1 — CNAE & Termos
| Campo | Tipo | API param | Obrigatório |
|-------|------|-----------|-------------|
| Código CNAE | text (multi, vírgula) | `cnaes` | Sim |
| CNPJs específicos | text (multi) | `cnpjs` | Não |
| Palavras-chave | tags input | `termos_busca` | Não |
| → Buscar em Razão Social | checkbox | `tipo: "R"` | Não |
| → Buscar em Nome Fantasia | checkbox | `tipo: "F"` | Não |
| Incluir CNAEs secundários | checkbox | `incluir_cnaes_secundarios` | Não |
| Somente matrizes | checkbox | `somente_matrizes` | Não |

**Palavras-chave** são inseridas como tags; cada tag pode ser configurada para buscar em Razão Social (`R`), Nome Fantasia (`F`) ou ambos (`A`). O campo envia o array `termos_busca` conforme a spec da API.

#### Aba 2 — Empresa
| Campo | Tipo | API param / fonte |
|-------|------|-------------------|
| Porte | chips multi-select | `municipios` → Lista CNAE |
| Situação cadastral | chips multi-select | pós-busca via BrasilAPI |
| Capital social mínimo | number | `capital_social_minimo` |
| Capital social máximo | number | `capital_social_maximo` |
| Simples Nacional | chips (Ignorar / Apenas / Excluir) | `simples_nacional` |
| MEI | chips (Ignorar / Apenas / Excluir) | `mei` |

**Nota sobre situação cadastral:** a Lista CNAE não filtra por situação diretamente. O filtro será aplicado no frontend após enriquecimento com BrasilAPI (ver §3). O comportamento padrão é "Ativa" selecionada.

#### Aba 3 — Localização
| Campo | Tipo | API param |
|-------|------|-----------|
| Estado (UF) | select multi | `estados` |
| Município | text | `municipios` |
| Registros por página | chips (10/25/50/100) | `quantidade` |

#### Aba 4 — Contato & Período
| Campo | Tipo | API param |
|-------|------|-----------|
| Somente com telefone | checkbox | `telefone_obrigatorio` |
| Somente com e-mail | checkbox | `email_obrigatorio` |
| Data de abertura — De | date | `data_inicio` |
| Data de abertura — Até | date | `data_fim` |

---

### 2.2 ResultadosWindow — Abrir FichaWindow ao clicar

- Clicar em qualquer **linha da tabela** ou no botão **"Ficha"** abre a FichaWindow para aquela empresa.
- A lógica já existe para o botão Ficha; basta adicionar o handler `onClick` na `<tr>`.
- O cursor muda para `pointer` na linha para indicar que é clicável.

---

### 2.3 Enriquecimento com BrasilAPI após busca

Após a Lista CNAE retornar os resultados, o sistema busca os dados completos de cada empresa via `/api/cnpj/[cnpj]` (BrasilAPI).

**Estratégia de enriquecimento:**

1. A rota `POST /api/busca-cnae` retorna a lista de empresas da Lista CNAE como hoje.
2. No **frontend**, após receber a resposta, é disparado um `Promise.all` em lotes de até 10 CNPJs simultâneos para `/api/cnpj/[cnpj]`.
3. Os dados do CNPJ enriquecem o objeto `Empresa` com os campos adicionais.
4. A tabela exibe os dados enriquecidos conforme chegam (loading progressivo por linha).

**Por que no frontend (não no backend):**
- Evita timeout de 30s no Vercel para buscas com muitos resultados.
- Permite exibição progressiva: o usuário vê os primeiros resultados enquanto o resto carrega.
- Mantém as rotas de API simples e independentes.

**Campos adicionados ao tipo `Empresa` pelo enriquecimento:**
```typescript
// Identificação
naturezaJuridica?: string
descricaoMatrizFilial?: string   // "MATRIZ" | "FILIAL"

// Endereço completo
logradouro?: string
numero?: string
complemento?: string
bairro?: string
cep?: string

// Situação cadastral
situacaoCadastral?: number       // 1 | 2 | 3 | 4 | 8
descricaoSituacaoCadastral?: string
dataSituacaoCadastral?: string
motivoSituacaoCadastral?: number
descricaoMotivoSituacao?: string

// Fiscal
opcaoSimples?: boolean | null
opcaoMei?: boolean | null
regimeTributario?: { ano: number; formaTributacao: string }[]

// Contato
dddTelefone1?: string
dddTelefone2?: string

// CNAE
cnaeSecundarios?: { codigo: number; descricao: string }[]

// Sócios (QSA)
socios?: {
  nomeSocio: string
  qualificacaoSocio: string
  faixaEtaria: string
  dataEntradaSociedade: string
  cnpjCpfSocio?: string
}[]

// Data de abertura
dataInicioAtividade?: string
```

---

### 2.4 FichaWindow — Dados completos

A FichaWindow já existe e busca dados da BrasilAPI ao ser aberta. Com o enriquecimento de §2.3, os dados já estarão pré-carregados quando o usuário clicar — a Ficha abrirá instantaneamente sem novo fetch (usando os dados já enriquecidos).

**Fallback:** se o enriquecimento ainda não terminou para aquela empresa, a Ficha continua fazendo o fetch normalmente como hoje.

---

### 2.5 Filtro de Situação Cadastral (pós-busca)

Como a Lista CNAE não filtra por situação, o filtro é aplicado no **frontend** após o enriquecimento:

- Se o usuário selecionou situações na aba Empresa, as empresas cujo `descricaoSituacaoCadastral` não bate com a seleção são ocultadas da tabela (não removidas do estado — ficam ocultas para não quebrar paginação).
- Um aviso é exibido: *"X empresas ocultadas por filtro de situação cadastral"*.

---

## 3. Mudanças de Componentes

| Componente | Mudança |
|-----------|---------|
| `BuscaWindow.tsx` | Reescrever formulário com 4 abas; expandir payload da busca |
| `ResultadosWindow.tsx` | Adicionar `onClick` na `<tr>`; estado de loading por linha no enriquecimento; indicador de enriquecimento em progresso |
| `FichaWindow.tsx` | Aceitar dados pré-carregados via prop; mostrar todos os campos novos |
| `app/api/busca-cnae/route.ts` | Nenhuma mudança (já suporta todos os params) |
| `app/api/cnpj/[cnpj]/route.ts` | Nenhuma mudança |
| `types/empresa.ts` | Adicionar campos de enriquecimento ao tipo `Empresa` |

---

## 4. Fora de Escopo

- Seletor de colunas configurável na tabela (feature futura)
- Exportação de campos enriquecidos para CSV/JSON (pode ser incluído como melhoria simples junto)
- Caching de enriquecimento entre sessões
- Filtro por município via código IBGE (mantém texto livre)

---

## 5. Critérios de Sucesso

1. Todos os parâmetros da API Lista CNAE estão acessíveis via formulário.
2. Clicar em uma linha da tabela abre a FichaWindow corretamente.
3. Após uma busca, as empresas são enriquecidas com dados BrasilAPI sem travar a UI.
4. O filtro de situação cadastral oculta empresas corretamente no frontend.
5. A FichaWindow exibe dados completos incluindo QSA (sócios), regime tributário e endereço completo.
