# Terminal + Startup + Perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melhorar o terminal (neofetch GOTHAM, help, novos comandos, gate de senha), remover auto-abertura de módulos no startup, e adicionar módulo de Perfil com UI pixel art.

**Architecture:** 8 tarefas independentes em sequência. Terminal changes in `CnaeTerminalWindow.tsx` + novas rotas API. Gate de senha via `TerminalPasswordGate` componente + `/api/auth/verify-senha`. Perfil via migration SQL + `PUT /api/perfil` + `GET /api/perfil/historico` + `PerfilWindow` component. Integração final em `CnaeDesktop.tsx`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase SSR (`createClient`/`createAdminClient`), Supabase Storage, lucide-react, Geist Mono.

---

## Estrutura de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `components/windows/CnaeTerminalWindow.tsx` | Modify | neofetch GOTHAM, help, novos comandos, flags |
| `components/CnaeDesktop.tsx` | Modify | remover bootstrap, gate de terminal, perfil |
| `components/TerminalPasswordGate.tsx` | Create | modal overlay de verificação de senha |
| `components/windows/PerfilWindow.tsx` | Create | perfil com pixel art, foto, gênero, histórico |
| `app/api/auth/verify-senha/route.ts` | Create | POST — verifica código de acesso do usuário |
| `app/api/terminal/historico/route.ts` | Create | GET — últimas N buscas do historico_buscas |
| `app/api/terminal/stats/route.ts` | Create | GET — total buscas e resultados do usuário |
| `app/api/perfil/route.ts` | Create | PUT — atualiza nome, genero, foto_url |
| `app/api/perfil/historico/route.ts` | Create | GET — últimas 20 buscas para o PerfilWindow |
| `supabase/migrations/005_perfil.sql` | Create | ADD COLUMN foto_url, genero em perfis |

---

## Task 1: Startup Fechado

**Files:**
- Modify: `components/CnaeDesktop.tsx` (linhas 588-593)

- [ ] **Step 1: Remover o useEffect de bootstrap**

Localizar e remover o bloco (linhas 588–593):

```tsx
// REMOVER COMPLETAMENTE:
  // Bootstrap: open busca + terminal on first load
  useEffect(() => {
    openBusca()
    openTerminal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npx tsc --noEmit
```

Expected: sem erros novos (os 2 pré-existentes em `.next/dev/types/validator.ts` são ignorados).

- [ ] **Step 3: Commit**

```bash
git add components/CnaeDesktop.tsx
git commit -m "feat: desktop starts with closed modules on login"
```

---

## Task 2: Terminal Correções (neofetch GOTHAM + help + textos)

**Files:**
- Modify: `components/windows/CnaeTerminalWindow.tsx`

- [ ] **Step 1: Substituir constante NEOFETCH**

Substituir o bloco `const NEOFETCH = [...]` (linhas 18–31) por:

```tsx
const NEOFETCH = [
  { type: 'amber' as const, text: '  ██████╗  ██████╗ ████████╗██╗  ██╗ █████╗ ███╗   ███╗' },
  { type: 'amber' as const, text: ' ██╔════╝ ██╔═══██╗╚══██╔══╝██║  ██║██╔══██╗████╗ ████║' },
  { type: 'amber' as const, text: ' ██║  ███╗██║   ██║   ██║   ███████║███████║██╔████╔██║' },
  { type: 'amber' as const, text: ' ██║   ██║██║   ██║   ██║   ██╔══██║██╔══██║██║╚██╔╝██║' },
  { type: 'amber' as const, text: ' ╚██████╔╝╚██████╔╝   ██║   ██║  ██║██║  ██║██║ ╚═╝ ██║' },
  { type: 'amber' as const, text: '  ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝' },
  { type: 'dim' as const,   text: '  ──────────────────────────────────────────────────────' },
  { type: 'output' as const, text: '  OS:       Gotham v1.0.0' },
  { type: 'output' as const, text: '  Modulos:  Busca · CNPJ · Admin' },
  { type: 'output' as const, text: '  Kernel:   Next.js 14 / React 18' },
  { type: 'output' as const, text: '  Shell:    gotham-shell 1.0' },
  { type: 'dim' as const,   text: '  ──────────────────────────────────────────────────────' },
]
```

- [ ] **Step 2: Substituir constante HELP**

Substituir o bloco `const HELP: Line[] = [...]` (linhas 33–41) por:

```tsx
const HELP_GERAL: Line[] = [
  { type: 'amber', text: 'Comandos disponíveis:' },
  { type: 'output', text: '  buscar  --cnae=<cod> [--uf=UF] [--municipio=nome] [--porte=ME|EPP|DEMAIS]' },
  { type: 'output', text: '          [--n=25] [--simples=S|N] [--mei=S|N]' },
  { type: 'output', text: '  ficha   <cnpj>      — ficha completa de um CNPJ' },
  { type: 'output', text: '  historico [--n=10]  — suas últimas N buscas' },
  { type: 'output', text: '  stats               — total de buscas e resultados' },
  { type: 'output', text: '  exportar            — baixa últimos resultados como CSV' },
  { type: 'output', text: '  janela busca        — abre a janela de busca visual' },
  { type: 'output', text: '  neofetch            — informações do sistema' },
  { type: 'output', text: '  limpar | cls        — limpa o terminal' },
  { type: 'output', text: '  help [comando]      — esta mensagem ou ajuda detalhada' },
]

const HELP_DETALHE: Record<string, Line[]> = {
  buscar: [
    { type: 'amber', text: 'buscar — Busca empresas por CNAE' },
    { type: 'output', text: '  --cnae=<cod>        CNAE principal (obrigatório). Ex: 6201500' },
    { type: 'output', text: '                      Múltiplos: --cnae=6201500,6202300' },
    { type: 'output', text: '  --uf=<UF>           Filtro por estado. Ex: --uf=SP' },
    { type: 'output', text: '  --municipio=<nome>  Filtro por município. Ex: --municipio=Campinas' },
    { type: 'output', text: '  --porte=<porte>     ME | EPP | DEMAIS' },
    { type: 'output', text: '  --n=<qtd>           Quantidade de resultados (padrão 25, máx 100)' },
    { type: 'output', text: '  --simples=S|N       Filtro Simples Nacional' },
    { type: 'output', text: '  --mei=S|N           Filtro MEI' },
  ],
  ficha: [
    { type: 'amber', text: 'ficha — Consulta dados completos de um CNPJ' },
    { type: 'output', text: '  Uso: ficha <cnpj>' },
    { type: 'output', text: '  Ex:  ficha 11.222.333/0001-44' },
    { type: 'output', text: '  Exibe CNPJ, situação, CNAE, endereço, capital e e-mail.' },
  ],
  historico: [
    { type: 'amber', text: 'historico — Lista suas últimas buscas' },
    { type: 'output', text: '  Uso: historico [--n=10]' },
    { type: 'output', text: '  --n=<qtd>  Número de buscas a exibir (padrão 10, máx 50)' },
  ],
  stats: [
    { type: 'amber', text: 'stats — Estatísticas de uso' },
    { type: 'output', text: '  Exibe: total de buscas, total de empresas encontradas, data da primeira busca.' },
  ],
  exportar: [
    { type: 'amber', text: 'exportar — Exporta últimos resultados como CSV' },
    { type: 'output', text: '  Execute buscar primeiro para ter resultados. O CSV inclui:' },
    { type: 'output', text: '  cnpj, razaoSocial, nomeFantasia, uf, municipio, cnae' },
  ],
}
```

- [ ] **Step 3: Atualizar welcome message e error fallback**

No `useState` inicial (linha 57–62), trocar `"ajuda"` por `"help"`:

```tsx
const [lines, setLines] = useState<Line[]>([
  ...NEOFETCH,
  { type: 'dim', text: '' },
  { type: 'output', text: 'Digite "help" para ver os comandos.' },
  { type: 'dim', text: '' },
])
```

Na função `execute` (linha 197), trocar a mensagem de erro:
```tsx
addLines([{ type: 'error', text: `Comando não reconhecido: "${command}". Digite "help".` }])
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/windows/CnaeTerminalWindow.tsx
git commit -m "feat: terminal — neofetch GOTHAM, rename ajuda to help, hide API names"
```

---

## Task 3: Terminal Novos Comandos

**Files:**
- Modify: `components/windows/CnaeTerminalWindow.tsx`
- Create: `app/api/terminal/historico/route.ts`
- Create: `app/api/terminal/stats/route.ts`

- [ ] **Step 1: Criar `app/api/terminal/historico/route.ts`**

```ts
// app/api/terminal/historico/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const n = Math.min(parseInt(searchParams.get('n') ?? '10', 10), 50)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('historico_buscas')
    .select('id, cnaes, params, total_resultados, criado_em')
    .eq('usuario_id', user.id)
    .order('criado_em', { ascending: false })
    .limit(n)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ historico: data ?? [] })
}
```

- [ ] **Step 2: Criar `app/api/terminal/stats/route.ts`**

```ts
// app/api/terminal/stats/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('historico_buscas')
    .select('total_resultados, criado_em')
    .eq('usuario_id', user.id)
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total_buscas = data?.length ?? 0
  const total_resultados = data?.reduce((sum, h) => sum + (h.total_resultados ?? 0), 0) ?? 0
  const primeira_busca = data?.[0]?.criado_em ?? null

  return NextResponse.json({ total_buscas, total_resultados, primeira_busca })
}
```

- [ ] **Step 3: Adicionar ref de últimos resultados e handlers no CnaeTerminalWindow**

No topo do componente `CnaeTerminalWindow`, após os estados existentes, adicionar:

```tsx
const lastResultsRef = useRef<import('@/types/empresa').Empresa[]>([])
```

Na função `handleBuscar`, após `onResultados?.({...})`, adicionar:
```tsx
lastResultsRef.current = empresas
```

- [ ] **Step 4: Adicionar handler `handleHistorico`**

Adicionar após `handleFicha`:

```tsx
async function handleHistorico(args: Record<string, string>) {
  const n = args['n'] ?? '10'
  addLines([{ type: 'dim', text: `Carregando últimas ${n} buscas...` }])
  setLoading(true)
  try {
    const res = await fetch(`/api/terminal/historico?n=${n}`)
    const data: { historico?: Array<{ cnaes: string[]; total_resultados: number; criado_em: string }>; error?: string } = await res.json()
    if (!res.ok) {
      addLines([{ type: 'error', text: `Erro: ${data.error}` }])
    } else if (!data.historico?.length) {
      addLines([{ type: 'dim', text: 'Nenhuma busca encontrada.' }])
    } else {
      addLines([
        { type: 'amber', text: `Últimas ${data.historico.length} buscas:` },
        { type: 'dim', text: '─'.repeat(60) },
        ...data.historico.map(h => ({
          type: 'output' as const,
          text: `  ${new Date(h.criado_em).toLocaleDateString('pt-BR')}  CNAE ${h.cnaes.join(', ')}  →  ${h.total_resultados.toLocaleString('pt-BR')} emp.`,
        })),
        { type: 'dim', text: '─'.repeat(60) },
      ])
    }
  } catch {
    addLines([{ type: 'error', text: 'Falha na conexão.' }])
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 5: Adicionar handler `handleStats`**

Adicionar após `handleHistorico`:

```tsx
async function handleStats() {
  addLines([{ type: 'dim', text: 'Carregando estatísticas...' }])
  setLoading(true)
  try {
    const res = await fetch('/api/terminal/stats')
    const data: { total_buscas?: number; total_resultados?: number; primeira_busca?: string | null; error?: string } = await res.json()
    if (!res.ok) {
      addLines([{ type: 'error', text: `Erro: ${data.error}` }])
    } else {
      const primeiraDt = data.primeira_busca
        ? new Date(data.primeira_busca).toLocaleDateString('pt-BR')
        : '—'
      addLines([
        { type: 'amber', text: 'Suas estatísticas:' },
        { type: 'dim', text: '─'.repeat(40) },
        { type: 'output', text: `  Buscas realizadas:    ${(data.total_buscas ?? 0).toLocaleString('pt-BR')}` },
        { type: 'output', text: `  Empresas encontradas: ${(data.total_resultados ?? 0).toLocaleString('pt-BR')}` },
        { type: 'output', text: `  Primeira busca:       ${primeiraDt}` },
        { type: 'dim', text: '─'.repeat(40) },
      ])
    }
  } catch {
    addLines([{ type: 'error', text: 'Falha na conexão.' }])
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 6: Adicionar handler `handleExportar`**

Adicionar após `handleStats`:

```tsx
function handleExportar() {
  const results = lastResultsRef.current
  if (!results.length) {
    addLines([{ type: 'error', text: 'Nenhum resultado para exportar. Execute "buscar" primeiro.' }])
    return
  }
  const headers = 'cnpj,razaoSocial,nomeFantasia,uf,municipio,cnae'
  const rows = results.map(e =>
    [
      e.cnpj,
      `"${(e.razaoSocial ?? '').replace(/"/g, '""')}"`,
      `"${(e.nomeFantasia ?? '').replace(/"/g, '""')}"`,
      e.uf,
      e.municipio,
      e.cnae,
    ].join(',')
  )
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gotham-exportacao-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  addLines([{ type: 'success', text: `CSV exportado: ${results.length} empresas.` }])
}
```

- [ ] **Step 7: Atualizar a função `execute` com os novos comandos e flags**

Substituir a função `execute` completa:

```tsx
async function execute(cmd: string) {
  const trimmed = cmd.trim()
  if (!trimmed) return
  addLines([{ type: 'input', text: `$ ${trimmed}` }])
  setHistory(h => [trimmed, ...h.slice(0, 49)])
  setHistIdx(-1)

  const [command, ...tokens] = trimmed.split(/\s+/)
  const args = parseArgs(tokens)

  if (command === 'ajuda' || command === 'help') {
    const sub = tokens[0]?.toLowerCase()
    if (sub && HELP_DETALHE[sub]) {
      addLines(HELP_DETALHE[sub])
    } else {
      addLines(HELP_GERAL)
    }
  } else if (command === 'neofetch') {
    addLines(NEOFETCH)
  } else if (command === 'limpar' || command === 'clear' || command === 'cls') {
    setLines([])
  } else if (command === 'buscar' || command === 'search') {
    await handleBuscar(args)
  } else if (command === 'ficha') {
    const cnpj = tokens[0] ?? args['_'] ?? ''
    await handleFicha(cnpj)
  } else if (command === 'historico') {
    await handleHistorico(args)
  } else if (command === 'stats') {
    await handleStats()
  } else if (command === 'exportar') {
    handleExportar()
  } else if (command === 'janela' || command === 'open') {
    const sub = tokens[0]?.toLowerCase()
    if (sub === 'busca') {
      onAbrirBusca?.()
      addLines([{ type: 'success', text: 'Janela de busca aberta.' }])
    } else {
      addLines([{ type: 'error', text: `Janela desconhecida: ${sub}` }])
    }
  } else {
    addLines([{ type: 'error', text: `Comando não reconhecido: "${command}". Digite "help".` }])
  }

  addLines([{ type: 'dim', text: '' }])
}
```

- [ ] **Step 8: Atualizar `handleBuscar` para suportar `--simples` e `--mei`**

Dentro de `handleBuscar`, após `if (uf) payload.estados = [uf.toUpperCase()]`, adicionar:

```tsx
if (args['simples']) payload.opcao_pelo_simples = args['simples'].toUpperCase() === 'S'
if (args['mei']) payload.opcao_pelo_mei = args['mei'].toUpperCase() === 'S'
```

- [ ] **Step 9: Verificar TypeScript**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npx tsc --noEmit
```

Expected: sem erros. Se `Empresa` não tiver `cnae`, usar `e.cnae ?? e.cnaeDescricao ?? ''` na exportação.

- [ ] **Step 10: Commit**

```bash
git add components/windows/CnaeTerminalWindow.tsx \
        app/api/terminal/historico/route.ts \
        app/api/terminal/stats/route.ts
git commit -m "feat: terminal — add historico, stats, exportar, cls, help detail, simples/mei flags"
```

---

## Task 4: Gate de Senha do Terminal

**Files:**
- Create: `app/api/auth/verify-senha/route.ts`
- Create: `components/TerminalPasswordGate.tsx`
- Modify: `components/CnaeDesktop.tsx`

- [ ] **Step 1: Criar `app/api/auth/verify-senha/route.ts`**

```ts
// app/api/auth/verify-senha/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: { senha?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { senha } = body
  if (!senha || typeof senha !== 'string' || senha.length < 4) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senha,
  })

  if (error) {
    return NextResponse.json({ error: 'Código incorreto' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Criar `components/TerminalPasswordGate.tsx`**

```tsx
// components/TerminalPasswordGate.tsx
'use client'

import { useState } from 'react'
import { Terminal } from 'lucide-react'

interface Props {
  onConfirm: () => void
  onCancel: () => void
}

export function TerminalPasswordGate({ onConfirm, onCancel }: Props) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [verificando, setVerificando] = useState(false)

  async function verificar() {
    if (!senha) return
    setVerificando(true)
    setErro('')
    try {
      const res = await fetch('/api/auth/verify-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d.error ?? 'Código incorreto')
        setSenha('')
        return
      }
      onConfirm()
    } catch {
      setErro('Erro de conexão')
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
    }}>
      <div style={{
        background: '#f5f1e8',
        border: '1.5px solid #c8b888',
        borderRadius: 12,
        padding: 28,
        width: 380,
        fontFamily: "'Geist Mono', monospace",
        boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 30, height: 30, background: '#fbbf24', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Terminal size={16} color="#1a1208" />
          </div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#2c2416' }}>Acesso ao Terminal</h2>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 11, color: '#7a6a4a' }}>
          Digite seu código de acesso para continuar.
        </p>

        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verificar()}
          autoFocus
          placeholder="••••••"
          style={{
            display: 'block', width: '100%',
            padding: '10px 12px',
            background: '#ede8da',
            border: `1px solid ${erro ? '#f87171' : '#c8b888'}`,
            borderRadius: 6, fontSize: 13,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            color: '#2c2416',
            outline: 'none',
          }}
        />

        {erro && (
          <p style={{
            margin: '8px 0 0', fontSize: 11,
            color: '#dc2626',
            background: '#fee2e2',
            padding: '6px 10px',
            borderRadius: 5,
          }}>
            {erro}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px 0',
              background: '#ede8da', border: '1px solid #c8b888',
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', color: '#7a6a4a',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={verificar}
            disabled={verificando || !senha}
            style={{
              flex: 1, padding: '9px 0',
              background: verificando || !senha ? '#e0d8c4' : '#fbbf24',
              border: '1.5px solid #d97706',
              borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: verificando || !senha ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', color: '#1a1208',
            }}
          >
            {verificando ? 'Verificando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Integrar gate em `CnaeDesktop.tsx`**

**3a — Adicionar import** (junto com os outros imports de components):
```tsx
import { TerminalPasswordGate } from './TerminalPasswordGate'
```

**3b — Adicionar estado** (logo após `const [clock, setClock] = useState('')`):
```tsx
const [terminalGateAberto, setTerminalGateAberto] = useState(false)
```

**3c — Adicionar callback `openTerminalComGate`** (logo após o callback `openTerminal`):
```tsx
const openTerminalComGate = useCallback(() => {
  setTerminalGateAberto(true)
}, [])
```

**3d — No menu bar**, substituir a linha do Terminal:
```tsx
// DE:
{ label: 'Terminal', fn: openTerminal, icon: <Terminal size={11} />, modulo: 'terminal' as const },
// PARA:
{ label: 'Terminal', fn: openTerminalComGate, icon: <Terminal size={11} />, modulo: 'terminal' as const },
```

**3e — No desktop icon do Terminal**, substituir `onClick={openTerminal}` por `onClick={openTerminalComGate}`.

**3f — Adicionar o modal** no JSX, logo antes do fechamento do `<div>` raiz (após o bloco de `{/* ── Windows ─── */}`):
```tsx
{/* ── Terminal Gate ──────────────────────────────────────────────── */}
{terminalGateAberto && (
  <TerminalPasswordGate
    onConfirm={() => {
      setTerminalGateAberto(false)
      openTerminal()
    }}
    onCancel={() => setTerminalGateAberto(false)}
  />
)}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/verify-senha/route.ts \
        components/TerminalPasswordGate.tsx \
        components/CnaeDesktop.tsx
git commit -m "feat: terminal password gate before opening terminal"
```

---

## Task 5: Migration 005_perfil.sql

**Files:**
- Create: `supabase/migrations/005_perfil.sql`

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- 005_perfil.sql — Adiciona foto_url e genero ao perfil de usuário

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS genero text
    CHECK (genero IN ('m', 'f'));

-- Storage: o bucket 'avatars' deve ser criado manualmente no Supabase Dashboard:
-- Storage > New bucket > Name: "avatars" > Public: sim > Max file size: 2MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Após criar o bucket, adicionar política de storage no Dashboard:
-- Policy name: "usuario_gerencia_proprio_avatar"
-- INSERT/UPDATE/DELETE: (bucket_id = 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text
-- SELECT: bucket_id = 'avatars'  (leitura pública)
```

- [ ] **Step 2: Aplicar a migração no Supabase Dashboard**

1. Abrir https://supabase.com/dashboard → projeto `jpazzkivktidryeieblj`
2. SQL Editor → colar e executar:
```sql
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS genero text
    CHECK (genero IN ('m', 'f'));
```
3. Verificar: `SELECT id, nome, foto_url, genero FROM perfis;` — colunas devem aparecer

- [ ] **Step 3: Criar bucket `avatars` no Supabase Dashboard (manual)**

1. Storage → New bucket → Name: `avatars` → Public: ✅ → Max file size: 2097152 (2MB)
2. Policies → For bucket `avatars`:
   - SELECT (público): `bucket_id = 'avatars'`
   - INSERT (autenticado, pasta própria): `(bucket_id = 'avatars') AND ((storage.foldername(name))[1] = (auth.uid())::text)`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_perfil.sql
git commit -m "feat: add foto_url and genero columns to perfis"
```

---

## Task 6: Rotas API do Perfil

**Files:**
- Create: `app/api/perfil/route.ts`
- Create: `app/api/perfil/historico/route.ts`

- [ ] **Step 1: Criar `app/api/perfil/route.ts`**

```ts
// app/api/perfil/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, cpf, nivel, modulos_permitidos, foto_url, genero')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ perfil: data })
}

export async function PUT(request: Request) {
  let body: { nome?: unknown; genero?: unknown; foto_url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const update: Record<string, unknown> = {}

  if (body.nome !== undefined) {
    if (typeof body.nome !== 'string' || body.nome.trim().length === 0) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    }
    update.nome = body.nome.trim()
  }

  if (body.genero !== undefined) {
    if (body.genero !== 'm' && body.genero !== 'f' && body.genero !== null) {
      return NextResponse.json({ error: 'Gênero inválido' }, { status: 400 })
    }
    update.genero = body.genero
  }

  if (body.foto_url !== undefined) {
    if (typeof body.foto_url !== 'string' && body.foto_url !== null) {
      return NextResponse.json({ error: 'foto_url inválida' }, { status: 400 })
    }
    update.foto_url = body.foto_url
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('perfis')
    .update(update)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Criar `app/api/perfil/historico/route.ts`**

```ts
// app/api/perfil/historico/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('historico_buscas')
    .select('id, cnaes, params, total_resultados, criado_em')
    .eq('usuario_id', user.id)
    .order('criado_em', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ historico: data ?? [] })
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/perfil/route.ts app/api/perfil/historico/route.ts
git commit -m "feat: add GET/PUT /api/perfil and GET /api/perfil/historico routes"
```

---

## Task 7: PerfilWindow Component

**Files:**
- Create: `components/windows/PerfilWindow.tsx`

- [ ] **Step 1: Criar `components/windows/PerfilWindow.tsx`**

```tsx
// components/windows/PerfilWindow.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Pixel box style (técnica do design de referência) ──────────────────────
const pixelBox: React.CSSProperties = {
  background: '#f5f1e8',
  boxShadow: [
    '0px 3px #e7e7e7',
    '0px -3px #d4c4a8',
    '3px 0px #d4c4a8',
    '-3px 0px #d4c4a8',
    '0px -6px #b6a695',
    '0px 6px #b6a695',
    '6px 0px #b6a695',
    '-6px 0px #b6a695',
    '9px 0px rgba(0,0,0,0.08)',
    '0px 9px rgba(0,0,0,0.08)',
  ].join(', '),
  padding: '12px 16px',
  position: 'relative',
  fontFamily: "'Geist Mono', monospace",
}

const pixelBoxAmbar: React.CSSProperties = {
  ...pixelBox,
  background: '#fbbf24',
  boxShadow: [
    '0px 3px #fdbc3d',
    '0px -3px #fbbf24',
    '3px 0px #fbbf24',
    '-3px 0px #fbbf24',
    '0px -6px #d97706',
    '0px 6px #d97706',
    '6px 0px #d97706',
    '-6px 0px #d97706',
    '9px 0px rgba(0,0,0,0.08)',
    '0px 9px rgba(0,0,0,0.08)',
  ].join(', '),
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface PerfilData {
  id: string
  nome: string
  cpf: string
  nivel: 'admin' | 'agente'
  modulos_permitidos: string[]
  foto_url: string | null
  genero: 'm' | 'f' | null
}

interface HistoricoEntry {
  id: string
  cnaes: string[]
  total_resultados: number
  criado_em: string
}

// ─── Component ──────────────────────────────────────────────────────────────
export function PerfilWindow() {
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [historico, setHistorico] = useState<HistoricoEntry[]>([])
  const [nome, setNome] = useState('')
  const [genero, setGenero] = useState<'m' | 'f' | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregarPerfil = useCallback(async () => {
    const res = await fetch('/api/perfil')
    if (!res.ok) return
    const data = await res.json()
    const p: PerfilData = data.perfil
    setPerfil(p)
    setNome(p.nome ?? '')
    setGenero(p.genero ?? null)
    setFotoUrl(p.foto_url ?? null)
  }, [])

  const carregarHistorico = useCallback(async () => {
    const res = await fetch('/api/perfil/historico')
    if (!res.ok) return
    const data = await res.json()
    setHistorico(data.historico ?? [])
  }, [])

  useEffect(() => {
    carregarPerfil()
    carregarHistorico()
  }, [carregarPerfil, carregarHistorico])

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setErro('Imagem muito grande. Máximo 2MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErro('Formato não suportado. Use JPG, PNG ou WebP.')
      return
    }

    setUploadando(true)
    setErro('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust para forçar reload da imagem
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
      setFotoUrl(publicUrl)

      // Salva foto_url automaticamente
      await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_url: publicUrl }),
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao fazer upload')
    } finally {
      setUploadando(false)
    }
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    setSucesso(false)
    try {
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, genero }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      setSucesso(true)
      setTimeout(() => setSucesso(false), 2500)
      carregarPerfil()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const iniciais = nome ? nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '?'
  const cpfFormatado = perfil?.cpf
    ? perfil.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : '—'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#d4c4a8', fontFamily: "'Geist Mono', monospace", overflowY: 'auto' }}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Cabeçalho: avatar + nome + gênero ────────────────────────── */}
        <div style={{ ...pixelBox, display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Avatar */}
          <div
            onClick={() => !uploadando && fileInputRef.current?.click()}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#fbbf24',
              border: '3px solid #d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: uploadando ? 'wait' : 'pointer',
              overflow: 'hidden', flexShrink: 0,
              position: 'relative',
            }}
            title="Clique para alterar foto"
          >
            {fotoUrl ? (
              <img src={fotoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1208' }}>{iniciais}</span>
            )}
            {uploadando && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#fff' }}>...</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFotoUpload} />

          {/* Nome + Nível */}
          <div style={{ flex: 1 }}>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                display: 'block', width: '100%',
                padding: '8px 10px',
                background: '#ede8da', border: '1px solid #c8b888',
                borderRadius: 6, fontSize: 14, fontWeight: 700,
                fontFamily: 'inherit', color: '#2c2416',
                marginBottom: 8, boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: perfil?.nivel === 'admin' ? '#fef3c7' : '#f0fdf4',
              color: perfil?.nivel === 'admin' ? '#d97706' : '#16a34a',
              border: `1px solid ${perfil?.nivel === 'admin' ? '#fbbf24' : '#86efac'}`,
            }}>
              {(perfil?.nivel ?? 'agente').toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Seletor de gênero ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {(['m', 'f'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGenero(g)}
              style={{
                flex: 1, padding: '10px 0',
                ...(genero === g ? pixelBoxAmbar : pixelBox),
                cursor: 'pointer', border: 'none',
                fontSize: 12, fontWeight: 700,
                color: genero === g ? '#1a1208' : '#7a6a4a',
                textAlign: 'center',
              }}
            >
              {g === 'm' ? '♂  MASCULINO' : '♀  FEMININO'}
            </button>
          ))}
        </div>

        {/* ── Dados (somente leitura) ────────────────────────────────── */}
        <div style={{ ...pixelBox, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#7a6a4a' }}>MEUS DADOS</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: '#7a6a4a' }}>CPF</p>
              <p style={{ margin: 0, fontSize: 12, color: '#2c2416', fontWeight: 600 }}>{cpfFormatado}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: '#7a6a4a' }}>MÓDULOS</p>
              <p style={{ margin: 0, fontSize: 12, color: '#2c2416' }}>{perfil?.modulos_permitidos?.join(' · ') ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* ── Erros / Sucesso ───────────────────────────────────────── */}
        {erro && (
          <p style={{ margin: 0, padding: '8px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
            {erro}
          </p>
        )}
        {sucesso && (
          <p style={{ margin: 0, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: 11, color: '#16a34a' }}>
            ✓ Perfil salvo com sucesso.
          </p>
        )}

        {/* ── Botão Salvar ──────────────────────────────────────────── */}
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            ...pixelBoxAmbar,
            border: 'none', cursor: salvando ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, color: '#1a1208',
            opacity: salvando ? 0.7 : 1,
            alignSelf: 'flex-end',
            padding: '10px 28px',
          }}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>

        {/* ── Histórico de buscas ───────────────────────────────────── */}
        <div style={{ ...pixelBox, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: '#7a6a4a' }}>HISTÓRICO DE BUSCAS</p>
          {historico.length === 0 ? (
            <p style={{ margin: 0, fontSize: 11, color: '#a89868' }}>Nenhuma busca registrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {historico.map(h => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #e0d8c4',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: '#7a6a4a', marginRight: 12, flexShrink: 0 }}>
                    {new Date(h.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                  <span style={{ color: '#2c2416', flex: 1 }}>
                    CNAE {h.cnaes.slice(0, 3).join(', ')}{h.cnaes.length > 3 ? '...' : ''}
                  </span>
                  <span style={{ color: '#d97706', fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>
                    {h.total_resultados.toLocaleString('pt-BR')} emp.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/windows/PerfilWindow.tsx
git commit -m "feat: add PerfilWindow with pixel art style, avatar upload, gender selector and history"
```

---

## Task 8: Integrar PerfilWindow no CnaeDesktop

**Files:**
- Modify: `components/CnaeDesktop.tsx`

- [ ] **Step 1: Adicionar imports**

No bloco de imports do lucide-react, adicionar `User`:
```tsx
import {
  Search, Terminal, FileText, Building2, Clock, BarChart2,
  X, Minus, Maximize2, GripVertical, LogOut, ShieldCheck, User
} from 'lucide-react'
```

Adicionar import do componente (junto com os outros windows):
```tsx
import { PerfilWindow } from './windows/PerfilWindow'
```

- [ ] **Step 2: Adicionar callback `openPerfil`** (após `openCnpj`):

```tsx
// ─ Open Perfil ─
const openPerfil = useCallback(() => {
  upsertWindow('perfil', {
    title: 'perfil.sys',
    icon: <User size={13} color="#d97706" />,
    width: 560,
    height: 520,
    content: <PerfilWindow />,
  })
}, [upsertWindow])
```

- [ ] **Step 3: Adicionar item "Perfil" no menu bar**

No array do menu bar, adicionar antes do spread do Admin:

```tsx
{ label: 'Perfil', fn: openPerfil, icon: <User size={11} />, modulo: 'busca' as const },
```

**Nota:** usar `modulo: 'busca'` para que o Perfil apareça sempre que o usuário tiver acesso a qualquer módulo (todos os usuários ativos têm 'busca'). Assim não precisamos de uma nova lógica — qualquer usuário logado vê o Perfil.

- [ ] **Step 4: Adicionar ícone no desktop**

No bloco de Desktop Icons, adicionar após o ícone de CNPJ:

```tsx
<DesktopIcon label="perfil.sys" icon={<User size={20} color="#d97706" />} onClick={openPerfil} />
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npx tsc --noEmit
```

- [ ] **Step 6: Verificar build completo**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01 && npm run build
```

Expected: `Compiled successfully.`

- [ ] **Step 7: Commit**

```bash
git add components/CnaeDesktop.tsx
git commit -m "feat: integrate PerfilWindow into desktop with icon and menu item"
```

---

## Checklist de Verificação Final

- [ ] Desktop inicializa sem janelas abertas
- [ ] neofetch exibe "GOTHAM" em ASCII art âmbar
- [ ] `help` exibe lista de comandos, `help buscar` exibe flags detalhadas
- [ ] `historico` lista buscas do banco, `stats` exibe totais
- [ ] `exportar` baixa CSV dos últimos resultados
- [ ] Clicar em Terminal → gate de senha aparece → código errado → erro inline → código correto → terminal abre
- [ ] Perfil: avatar clicável faz upload para Storage, iniciais aparecem como fallback
- [ ] Perfil: seletor ♂/♀ com pixel art âmbar no selecionado
- [ ] Perfil: salvar atualiza nome e gênero
- [ ] Perfil: histórico exibe últimas 20 buscas
- [ ] Ícone `perfil.sys` no desktop abre PerfilWindow
