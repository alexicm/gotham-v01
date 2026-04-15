# UX Melhorias — Filtros, Enriquecimento CNPJ e FichaWindow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir filtros da BuscaWindow para 4 abas com todos os parâmetros da Lista CNAE API, enriquecer resultados com dados BrasilAPI em lotes progressivos, e habilitar abertura da FichaWindow ao clicar em qualquer linha da tabela.

**Architecture:** (1) `BuscaWindow` é reescrita com abas; o payload do `handleBuscar` é expandido para incluir todos os params da API. (2) Um hook `useEnrichment` busca dados BrasilAPI em lotes de 10 CNPJs em paralelo, expondo um `Map<cnpj, Empresa>` que atualiza progressivamente. (3) `CnaeDesktop` e `MobileLayout` orquestram o hook e passam o mapa para `ResultadosWindow`, que aplica filtros de porte/situação/município no frontend.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind (projeto usa inline styles — manter padrão existente), APIs: Lista CNAE + BrasilAPI.

---

## File Map

| Ação | Arquivo | O que muda |
|------|---------|-----------|
| Modify | `types/empresa.ts` | Expandir `BuscaParams` com novos filtros; adicionar `enriquecida?: boolean` a `Empresa` |
| Create | `hooks/useEnrichment.ts` | Hook de enriquecimento em lote |
| Rewrite | `components/windows/BuscaWindow.tsx` | 4 abas, todos os params |
| Modify | `components/windows/ResultadosWindow.tsx` | `onClick` na `<tr>`, props de enriquecimento, filtros frontend |
| Modify | `components/windows/FichaWindow.tsx` | Pular fetch se `empresaBase.enriquecida` |
| Modify | `components/CnaeDesktop.tsx` | Usar `useEnrichment`, passar dados para ResultadosWindow, corrigir paginação |
| Modify | `components/MobileLayout.tsx` | Mesma integração do `useEnrichment` |

---

## Task 1: Expandir tipos em `types/empresa.ts`

**Files:**
- Modify: `types/empresa.ts`

- [ ] **Step 1: Substituir a interface `BuscaParams` e adicionar `enriquecida` em `Empresa`**

Substituir o bloco atual de `BuscaParams` (linhas 98-106) e a definição de `Empresa` por:

```typescript
// Em Empresa (adicionar ao final da interface, antes do fechamento):
  enriquecida?: boolean  // true após enriquecimento BrasilAPI

// BuscaParams — substitui completamente o bloco existente:
export interface BuscaParams {
  // Params enviados à Lista CNAE API
  cnae?: string                  // string de CNAEs separados por vírgula (ex: "6201500,4530703")
  cnpjs?: string                 // CNPJs separados por vírgula (opcional)
  termosBusca?: string           // termos separados por vírgula (opcional)
  termoBuscaEm?: 'R' | 'F' | 'A' // Razão Social, Fantasia, Ambos (padrão 'A')
  incluirCnaesSecundarios?: boolean
  somenteMatrizes?: boolean
  simplesNacional?: 'ignorar' | 'apenas' | 'excluir'
  mei?: 'ignorar' | 'apenas' | 'excluir'
  capitalSocialMinimo?: number
  capitalSocialMaximo?: number
  telefoneObrigatorio?: boolean
  emailObrigatorio?: boolean
  dataInicio?: string            // ISO date YYYY-MM-DD
  dataFim?: string               // ISO date YYYY-MM-DD
  // Localização
  uf?: string                    // código UF (ex: "SP")
  municipio?: string             // texto livre (filtro frontend apenas)
  // Paginação/quantidade
  pagina?: number
  porPagina?: number
  // Filtros frontend (aplicados pós-busca)
  filtroPortes?: string[]        // ex: ['ME', 'EPP']
  filtroSituacoes?: string[]     // ex: ['ATIVA', 'SUSPENSA']
}
```

- [ ] **Step 2: Verificar que nenhum outro arquivo quebra com a mudança**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01
npx tsc --noEmit 2>&1 | head -40
```

Erros esperados: nenhum novo (os arquivos que usam `BuscaParams` ainda compilam porque adicionamos campos opcionais).

- [ ] **Step 3: Commit**

```bash
git add types/empresa.ts
git commit -m "feat: expand BuscaParams with all Lista CNAE API fields and enrichment flag"
```

---

## Task 2: Criar hook `hooks/useEnrichment.ts`

**Files:**
- Create: `hooks/useEnrichment.ts`

- [ ] **Step 1: Criar o arquivo do hook**

```typescript
// hooks/useEnrichment.ts
'use client'

import { useState, useCallback, useRef } from 'react'
import type { Empresa } from '@/types/empresa'

const BATCH_SIZE = 10

export function useEnrichment() {
  const [enrichedMap, setEnrichedMap] = useState<Map<string, Empresa>>(new Map())
  const [enrichingCnpjs, setEnrichingCnpjs] = useState<Set<string>>(new Set())
  // Ref para cancelar enriquecimento de busca anterior
  const cancelRef = useRef(false)

  const enrich = useCallback(async (empresas: Empresa[]) => {
    // Cancela run anterior e reseta estado
    cancelRef.current = true
    await new Promise(r => setTimeout(r, 0)) // yield para cancelar
    cancelRef.current = false

    setEnrichedMap(new Map())
    setEnrichingCnpjs(new Set())

    const todo = empresas.filter(e => !e.enriquecida)
    if (todo.length === 0) return

    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
      if (cancelRef.current) return

      const batch = todo.slice(i, i + BATCH_SIZE)
      const batchCnpjs = batch.map(e => e.cnpj)

      setEnrichingCnpjs(prev => {
        const next = new Set(prev)
        batchCnpjs.forEach(c => next.add(c))
        return next
      })

      await Promise.all(
        batch.map(async (empresa) => {
          if (cancelRef.current) return
          try {
            const digits = empresa.cnpj.replace(/\D/g, '')
            const res = await fetch(`/api/cnpj/${digits}`)
            if (res.ok && !cancelRef.current) {
              const data: Empresa = await res.json()
              data.enriquecida = true
              setEnrichedMap(prev => new Map(prev).set(empresa.cnpj, data))
            }
          } catch {
            // falha silenciosa — empresa fica sem enriquecimento
          } finally {
            if (!cancelRef.current) {
              setEnrichingCnpjs(prev => {
                const next = new Set(prev)
                next.delete(empresa.cnpj)
                return next
              })
            }
          }
        })
      )
    }
  }, [])

  return { enrich, enrichedMap, enrichingCnpjs }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add hooks/useEnrichment.ts
git commit -m "feat: add useEnrichment hook for progressive BrasilAPI batch fetching"
```

---

## Task 3: Reescrever `components/windows/BuscaWindow.tsx`

**Files:**
- Rewrite: `components/windows/BuscaWindow.tsx`

Esta é a maior mudança. A interface `Props` mantém a assinatura atual. O `onResultados` passa `BuscaResult` e o novo `BuscaParams` completo.

- [ ] **Step 1: Substituir o arquivo completo**

```tsx
// components/windows/BuscaWindow.tsx
'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { BuscaParams, BuscaResult } from '@/types/empresa'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface Props {
  onResultados: (result: BuscaResult, params: BuscaParams) => void
  onLoadingChange?: (loading: boolean) => void
}

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#fdf9f0',
  border: '1px solid #c8b888', borderRadius: 8, fontSize: 13,
  color: '#2c2416', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', minHeight: 40,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#7a6a4a',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
}
const sectionTitle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#a89868',
  textTransform: 'uppercase', margin: '14px 0 8px', borderBottom: '1px solid #e0d8c8',
  paddingBottom: 4,
}

// ─── Componente Chip (toggle) ─────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 20, fontSize: 11, fontFamily: 'inherit',
        border: `1px solid ${active ? '#d97706' : '#c8b888'}`,
        background: active ? '#fbbf24' : '#faf8f2',
        color: active ? '#2c2416' : '#7a6a4a',
        fontWeight: active ? 700 : 400, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ─── Componente Checkbox ──────────────────────────────────────────────────────
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: '#2c2416' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: `1.5px solid ${checked ? '#d97706' : '#c8b888'}`,
          background: checked ? '#fbbf24' : '#faf8f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked && <span style={{ fontSize: 9, color: '#2c2416', lineHeight: 1 }}>✓</span>}
      </div>
      {label}
    </label>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BuscaWindow({ onResultados, onLoadingChange }: Props) {
  // Aba ativa
  const [aba, setAba] = useState<'cnae' | 'empresa' | 'localiz' | 'periodo'>('cnae')

  // Aba 1 — CNAE & Termos
  const [cnae, setCnae] = useState('')
  const [cnpjs, setCnpjs] = useState('')
  const [termoInput, setTermoInput] = useState('')
  const [termos, setTermos] = useState<string[]>([])
  const [termoBuscaEm, setTermoBuscaEm] = useState<'R' | 'F' | 'A'>('A')
  const [incluirSecundarios, setIncluirSecundarios] = useState(false)
  const [somenteMatrizes, setSomenteMatrizes] = useState(false)

  // Aba 2 — Empresa
  const [filtroPortes, setFiltroPortes] = useState<string[]>([])
  const [filtroSituacoes, setFiltroSituacoes] = useState<string[]>(['ATIVA'])
  const [capitalMin, setCapitalMin] = useState('')
  const [capitalMax, setCapitalMax] = useState('')
  const [simples, setSimples] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')
  const [mei, setMei] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')

  // Aba 3 — Localização
  const [uf, setUf] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [porPagina, setPorPagina] = useState(50)

  // Aba 4 — Contato & Período
  const [telefoneObrigatorio, setTelefoneObrigatorio] = useState(false)
  const [emailObrigatorio, setEmailObrigatorio] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ─ Helpers ─
  function togglePorte(p: string) {
    setFiltroPortes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }
  function toggleSituacao(s: string) {
    setFiltroSituacoes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function adicionarTermo() {
    const t = termoInput.trim()
    if (t && !termos.includes(t)) setTermos(prev => [...prev, t])
    setTermoInput('')
  }

  // ─ Submit ─
  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    if (!cnae.trim()) { setError('Informe ao menos um CNAE.'); return }
    setError('')
    setLoading(true)
    onLoadingChange?.(true)

    const cnaes = cnae.trim().split(/[,\s]+/).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(Boolean)

    const payload: Record<string, unknown> = {
      cnaes,
      inicio: 0,
      quantidade: porPagina,
    }

    if (cnpjs.trim()) {
      payload.cnpjs = cnpjs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    }
    if (termos.length > 0) {
      payload.termos_busca = termos.map(t => ({ termo: t, tipo: termoBuscaEm }))
    }
    if (incluirSecundarios) payload.incluir_cnaes_secundarios = true
    if (somenteMatrizes) payload.somente_matrizes = true
    if (uf) payload.estados = [uf.toUpperCase()]
    if (capitalMin) payload.capital_social_minimo = Number(capitalMin)
    if (capitalMax) payload.capital_social_maximo = Number(capitalMax)
    if (simples === 'apenas') payload.simples_nacional = true
    if (simples === 'excluir') payload.simples_nacional = false
    if (mei === 'apenas') payload.mei = true
    if (mei === 'excluir') payload.mei = false
    if (telefoneObrigatorio) payload.telefone_obrigatorio = true
    if (emailObrigatorio) payload.email_obrigatorio = true
    if (dataInicio) payload.data_inicio = dataInicio
    if (dataFim) payload.data_fim = dataFim

    const params: BuscaParams = {
      cnae: cnae.trim(), cnpjs: cnpjs.trim() || undefined,
      termosBusca: termos.join(',') || undefined, termoBuscaEm,
      incluirCnaesSecundarios: incluirSecundarios || undefined,
      somenteMatrizes: somenteMatrizes || undefined,
      simplesNacional: simples, mei,
      capitalSocialMinimo: capitalMin ? Number(capitalMin) : undefined,
      capitalSocialMaximo: capitalMax ? Number(capitalMax) : undefined,
      uf: uf || undefined, municipio: municipio.trim() || undefined,
      porPagina, pagina: 1,
      telefoneObrigatorio: telefoneObrigatorio || undefined,
      emailObrigatorio: emailObrigatorio || undefined,
      dataInicio: dataInicio || undefined, dataFim: dataFim || undefined,
      filtroPortes: filtroPortes.length > 0 ? filtroPortes : undefined,
      filtroSituacoes: filtroSituacoes.length > 0 ? filtroSituacoes : undefined,
    }

    try {
      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao buscar empresas.'); return }
      onResultados(data, params)
    } catch {
      setError('Falha na conexao com a API.')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  // ─ Tabs ─
  const tabs: { id: typeof aba; label: string; badge?: number }[] = [
    { id: 'cnae', label: 'CNAE & Termos' },
    { id: 'empresa', label: 'Empresa', badge: [filtroPortes.length, filtroSituacoes.length].reduce((a, b) => a + b, 0) || undefined },
    { id: 'localiz', label: 'Localização' },
    { id: 'periodo', label: 'Contato & Período' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8' }}>
      <style>{`
        .busca-input:focus { border-color: #fbbf24 !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.18); }
        .busca-select { -webkit-appearance: none; appearance: none; }
        @keyframes busca-spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #ddd0b0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Search size={16} color="#d97706" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2416' }}>nova_busca.cnae</span>
        </div>
        <p style={{ fontSize: 11, color: '#7a6a4a', margin: 0 }}>Busque empresas por CNAE usando a base Lista CNAE</p>
      </div>

      {/* Tab bar */}
      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', background: '#ede8da', borderRadius: 7, padding: 3, gap: 2 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              style={{
                flex: 1, padding: '6px 4px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.05em', textAlign: 'center', border: 'none', borderRadius: 5,
                background: aba === t.id ? '#fbbf24' : 'transparent',
                color: aba === t.id ? '#2c2416' : '#7a6a4a',
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase',
                position: 'relative',
              }}
            >
              {t.label}
              {t.badge ? (
                <span style={{
                  position: 'absolute', top: 2, right: 4, background: '#d97706',
                  color: 'white', borderRadius: 3, padding: '0 4px', fontSize: 8, fontWeight: 700,
                }}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleBuscar}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      >
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ─ ABA: CNAE & Termos ─ */}
          {aba === 'cnae' && (
            <>
              <div>
                <label style={labelStyle}>Código CNAE *</label>
                <input
                  className="busca-input"
                  style={inputStyle}
                  type="text"
                  placeholder="Ex: 6201500, 4530703"
                  value={cnae}
                  onChange={e => setCnae(e.target.value)}
                  required
                  autoComplete="off"
                />
                <p style={{ fontSize: 10, color: '#a89868', marginTop: 3 }}>
                  Múltiplos CNAEs separados por vírgula
                </p>
              </div>
              <div>
                <label style={labelStyle}>CNPJs específicos <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
                <input
                  className="busca-input"
                  style={inputStyle}
                  type="text"
                  placeholder="Ex: 00.000.000/0001-91, 46729632000191"
                  value={cnpjs}
                  onChange={e => setCnpjs(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={labelStyle}>Palavras-chave na razão social / fantasia</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, background: '#fdf9f0', border: '1px solid #c8b888', borderRadius: 8, padding: '7px 10px', minHeight: 40, alignItems: 'center' }}>
                  {termos.map(t => (
                    <span key={t} style={{ background: '#ede8da', border: '1px solid #c8b888', borderRadius: 4, padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t}
                      <X size={10} style={{ cursor: 'pointer', color: '#a89868' }} onClick={() => setTermos(prev => prev.filter(x => x !== t))} />
                    </span>
                  ))}
                  <input
                    value={termoInput}
                    onChange={e => setTermoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); adicionarTermo() } }}
                    placeholder={termos.length === 0 ? 'Digite um termo e pressione Enter...' : '+ adicionar...'}
                    style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 11, outline: 'none', color: '#2c2416', minWidth: 120, flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#7a6a4a' }}>Buscar em:</span>
                  {[{ v: 'R' as const, l: 'Razão Social' }, { v: 'F' as const, l: 'Fantasia' }, { v: 'A' as const, l: 'Ambos' }].map(o => (
                    <Chip key={o.v} label={o.l} active={termoBuscaEm === o.v} onClick={() => setTermoBuscaEm(o.v)} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Checkbox label="Incluir CNAEs secundários" checked={incluirSecundarios} onChange={setIncluirSecundarios} />
                <Checkbox label="Somente matrizes (ignorar filiais)" checked={somenteMatrizes} onChange={setSomenteMatrizes} />
              </div>
            </>
          )}

          {/* ─ ABA: Empresa ─ */}
          {aba === 'empresa' && (
            <>
              <div>
                <label style={labelStyle}>Porte da empresa <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(filtro local)</span></label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ v: 'ME', l: 'Micro (ME)' }, { v: 'EPP', l: 'Peq. Porte (EPP)' }, { v: 'DEMAIS', l: 'Demais' }].map(o => (
                    <Chip key={o.v} label={o.l} active={filtroPortes.includes(o.v)} onClick={() => togglePorte(o.v)} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: '#a89868', marginTop: 4 }}>Nenhum selecionado = todos os portes</p>
              </div>
              <div>
                <label style={labelStyle}>Situação cadastral <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(filtro após enriquecimento)</span></label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['ATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA', 'NULA'].map(s => (
                    <Chip key={s} label={s} active={filtroSituacoes.includes(s)} onClick={() => toggleSituacao(s)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Capital social (R$)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="busca-input" style={inputStyle} type="number" min="0" placeholder="Mínimo" value={capitalMin} onChange={e => setCapitalMin(e.target.value)} />
                  <span style={{ fontSize: 12, color: '#a89868', flexShrink: 0 }}>—</span>
                  <input className="busca-input" style={inputStyle} type="number" min="0" placeholder="Máximo" value={capitalMax} onChange={e => setCapitalMax(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Simples Nacional</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'ignorar' as const, l: 'Ignorar' }, { v: 'apenas' as const, l: 'Apenas Simples' }, { v: 'excluir' as const, l: 'Excluir Simples' }].map(o => (
                    <Chip key={o.v} label={o.l} active={simples === o.v} onClick={() => setSimples(o.v)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>MEI</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'ignorar' as const, l: 'Ignorar' }, { v: 'apenas' as const, l: 'Apenas MEI' }, { v: 'excluir' as const, l: 'Excluir MEI' }].map(o => (
                    <Chip key={o.v} label={o.l} active={mei === o.v} onClick={() => setMei(o.v)} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─ ABA: Localização ─ */}
          {aba === 'localiz' && (
            <>
              <div>
                <label style={labelStyle}>Estado (UF)</label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="busca-select"
                    style={{ ...inputStyle, paddingRight: 36, cursor: 'pointer' }}
                    value={uf}
                    onChange={e => setUf(e.target.value)}
                  >
                    <option value="">Todos os estados</option>
                    {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z" fill="#a89868" /></svg>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Município <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(filtro local)</span></label>
                <input className="busca-input" style={inputStyle} type="text" placeholder="Ex: São Paulo, Campinas..." value={municipio} onChange={e => setMunicipio(e.target.value)} autoComplete="off" />
                <p style={{ fontSize: 10, color: '#a89868', marginTop: 3 }}>Filtro aplicado localmente nos resultados</p>
              </div>
              <div>
                <label style={labelStyle}>Registros por página</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[10, 25, 50, 100].map(n => (
                    <Chip key={n} label={String(n)} active={porPagina === n} onClick={() => setPorPagina(n)} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─ ABA: Contato & Período ─ */}
          {aba === 'periodo' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={sectionTitle}>Contato</p>
                <Checkbox label="Somente empresas com telefone" checked={telefoneObrigatorio} onChange={setTelefoneObrigatorio} />
                <Checkbox label="Somente empresas com e-mail" checked={emailObrigatorio} onChange={setEmailObrigatorio} />
              </div>
              <div>
                <p style={sectionTitle}>Data de Abertura</p>
                <label style={labelStyle}>Período</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="busca-input" style={inputStyle} type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                  <span style={{ fontSize: 12, color: '#a89868', flexShrink: 0 }}>—</span>
                  <input className="busca-input" style={inputStyle} type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <div style={{ borderTop: '1px solid #ddd0b0', padding: '14px 16px', flexShrink: 0 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 24px',
              background: loading ? '#e0d8c4' : '#fbbf24',
              color: loading ? '#a89868' : '#1a1208',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', minHeight: 48,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid #a89868', borderTopColor: '#7a6a4a', borderRadius: '50%', animation: 'busca-spin 0.7s linear infinite' }} />
                Buscando...
              </>
            ) : (
              <><Search size={15} /> Buscar empresas</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros. Se houver erro de tipo em `BuscaParams`, verificar se `types/empresa.ts` do Task 1 foi salvo corretamente.

- [ ] **Step 3: Commit**

```bash
git add components/windows/BuscaWindow.tsx
git commit -m "feat: rewrite BuscaWindow with 4-tab filter interface and full API params"
```

---

## Task 4: Atualizar `components/windows/ResultadosWindow.tsx`

**Files:**
- Modify: `components/windows/ResultadosWindow.tsx`

Mudanças: (1) `onClick` na `<tr>`, (2) novas props para enriquecimento e filtros, (3) merge de dados enriquecidos no display, (4) spinner por linha durante enriquecimento, (5) filtros de porte/situação/municipio.

- [ ] **Step 1: Atualizar a interface `Props`**

Localizar (linha 8):
```typescript
interface Props {
  resultado: BuscaResult
  onAbrirFicha: (empresa: Empresa) => void
  onPaginar?: (pagina: number) => void
  loadingPagina?: boolean
}
```

Substituir por:
```typescript
interface Props {
  resultado: BuscaResult
  onAbrirFicha: (empresa: Empresa) => void
  onPaginar?: (pagina: number) => void
  loadingPagina?: boolean
  enrichedMap?: Map<string, Empresa>
  enrichingCnpjs?: Set<string>
  buscaParams?: import('@/types/empresa').BuscaParams
}
```

- [ ] **Step 2: Atualizar a destructuring em `ResultadosWindow`**

Localizar (linha 179):
```typescript
export function ResultadosWindow({ resultado, onAbrirFicha, onPaginar, loadingPagina }: Props) {
```

Substituir por:
```typescript
export function ResultadosWindow({ resultado, onAbrirFicha, onPaginar, loadingPagina, enrichedMap, enrichingCnpjs, buscaParams }: Props) {
```

- [ ] **Step 3: Adicionar filtros de porte/situação/município no `useMemo` `filtered`**

Localizar (linha 194):
```typescript
  const filtered = useMemo(() => {
    const q = filtro.toLowerCase()
    return empresas.filter(e =>
      !q ||
      e.razaoSocial.toLowerCase().includes(q) ||
      e.nomeFantasia?.toLowerCase().includes(q) ||
      e.cnpj.includes(q) ||
      e.municipio?.toLowerCase().includes(q)
    )
  }, [empresas, filtro])
```

Substituir por:
```typescript
  const filtered = useMemo(() => {
    const q = filtro.toLowerCase()
    const filtroPortes = buscaParams?.filtroPortes ?? []
    const filtroSituacoes = buscaParams?.filtroSituacoes ?? []
    const filtroMunicipio = (buscaParams?.municipio ?? '').toLowerCase()

    return empresas.filter(e => {
      // Merge com dados enriquecidos para filtros
      const enriched = enrichedMap?.get(e.cnpj)
      const situacao = (enriched?.situacao ?? e.situacao ?? '').toUpperCase()
      const porte = enriched?.porte ?? e.porte ?? ''
      const municipioEmpresa = (enriched?.municipio ?? e.municipio ?? '').toLowerCase()

      if (filtroPortes.length > 0 && !filtroPortes.some(p => porte.toUpperCase().includes(p))) return false
      if (filtroSituacoes.length > 0 && !filtroSituacoes.includes(situacao)) return false
      if (filtroMunicipio && !municipioEmpresa.includes(filtroMunicipio)) return false

      return !q ||
        e.razaoSocial.toLowerCase().includes(q) ||
        (e.nomeFantasia?.toLowerCase() ?? '').includes(q) ||
        e.cnpj.includes(q) ||
        municipioEmpresa.includes(q)
    })
  }, [empresas, filtro, enrichedMap, enrichingCnpjs, buscaParams])
```

- [ ] **Step 4: Adicionar `onClick` na `<tr>` da tabela e indicador de enriquecimento**

Localizar a linha do `<tr>` da tabela (linha 346):
```tsx
                    <tr
                      key={empresa.cnpj}
                      className="res-row"
                      style={{ background: i % 2 === 0 ? '#faf8f2' : '#f5f1e8' }}
                    >
```

Substituir por:
```tsx
                    <tr
                      key={empresa.cnpj}
                      className="res-row"
                      onClick={() => onAbrirFicha(enrichedMap?.get(empresa.cnpj) ?? empresa)}
                      style={{
                        background: i % 2 === 0 ? '#faf8f2' : '#f5f1e8',
                        cursor: 'pointer',
                        opacity: enrichingCnpjs?.has(empresa.cnpj) ? 0.7 : 1,
                      }}
                    >
```

- [ ] **Step 5: Mostrar situação enriquecida na coluna Situacao**

Localizar o trecho que renderiza o badge de situação (dentro do `<td>` de situacao, por volta da linha 367):
```tsx
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 700,
                            background: situacaoColor(empresa.situacao) + '22',
                            color: situacaoColor(empresa.situacao),
                            border: `1px solid ${situacaoColor(empresa.situacao)}44`,
                          }}
                        >
                          {empresa.situacao}
                        </span>
                      </td>
```

Substituir por:
```tsx
                      <td style={tdStyle}>
                        {enrichingCnpjs?.has(empresa.cnpj) ? (
                          <span style={{ fontSize: 10, color: '#a89868' }}>...</span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                              fontSize: 10, fontWeight: 700,
                              background: situacaoColor(enrichedMap?.get(empresa.cnpj)?.situacao ?? empresa.situacao) + '22',
                              color: situacaoColor(enrichedMap?.get(empresa.cnpj)?.situacao ?? empresa.situacao),
                              border: `1px solid ${situacaoColor(enrichedMap?.get(empresa.cnpj)?.situacao ?? empresa.situacao)}44`,
                            }}
                          >
                            {enrichedMap?.get(empresa.cnpj)?.situacao ?? empresa.situacao}
                          </span>
                        )}
                      </td>
```

- [ ] **Step 6: Adicionar aviso de filtro de situação oculto**

Localizar o `<div style={{ flex: 1, overflowY: 'auto'...` que envolve o conteúdo. Adicionar logo após (antes do `loadingPagina ?`):

```tsx
        {/* Aviso de filtro de situação */}
        {buscaParams?.filtroSituacoes && buscaParams.filtroSituacoes.length > 0 && filtered.length < empresas.length && (
          <div style={{ margin: '8px 16px 0', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 6, padding: '6px 12px', fontSize: 11, color: '#7a6a4a' }}>
            {empresas.length - filtered.length} empresa(s) ocultada(s) pelo filtro de situação cadastral.
          </div>
        )}
```

- [ ] **Step 7: Verificar compilação e commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add components/windows/ResultadosWindow.tsx
git commit -m "feat: add row click, enrichment display and frontend filters to ResultadosWindow"
```

---

## Task 5: Atualizar `components/windows/FichaWindow.tsx`

**Files:**
- Modify: `components/windows/FichaWindow.tsx`

Mudança: pular fetch automático quando `empresaBase.enriquecida === true`.

- [ ] **Step 1: Atualizar o `useEffect` de busca**

Localizar (linha 109):
```typescript
  useEffect(() => {
    fetchFicha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpj])
```

Substituir por:
```typescript
  useEffect(() => {
    if (empresaBase?.enriquecida) {
      setEmpresa(empresaBase)
      return
    }
    fetchFicha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpj])
```

- [ ] **Step 2: Verificar compilação e commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add components/windows/FichaWindow.tsx
git commit -m "feat: skip BrasilAPI fetch in FichaWindow when empresa is already enriched"
```

---

## Task 6: Atualizar `components/CnaeDesktop.tsx`

**Files:**
- Modify: `components/CnaeDesktop.tsx`

Mudanças: (1) importar `useEnrichment`, (2) chamar `enrich` após cada busca, (3) passar `enrichedMap`/`enrichingCnpjs`/`buscaParams` para `ResultadosDesktopWrapper`, (4) corrigir o `paginar` para usar todos os campos de `BuscaParams`.

- [ ] **Step 1: Adicionar import de `useEnrichment`**

Localizar (linha 1):
```typescript
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
```

Substituir por:
```typescript
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEnrichment } from '@/hooks/useEnrichment'
```

- [ ] **Step 2: Atualizar a interface `Props` de `ResultadosDesktopWrapper`**

Localizar (linha 268):
```typescript
function ResultadosDesktopWrapper({
  resultado: initialResultado,
  onAbrirFicha,
  onPaginar,
}: {
  resultado: BuscaResult
  onAbrirFicha: (empresa: Empresa) => void
  onPaginar: (pagina: number) => Promise<void>
}) {
```

Substituir por:
```typescript
function ResultadosDesktopWrapper({
  resultado: initialResultado,
  onAbrirFicha,
  onPaginar,
  enrichedMap,
  enrichingCnpjs,
  buscaParams,
}: {
  resultado: BuscaResult
  onAbrirFicha: (empresa: Empresa) => void
  onPaginar: (pagina: number) => Promise<void>
  enrichedMap?: Map<string, Empresa>
  enrichingCnpjs?: Set<string>
  buscaParams?: BuscaParams
}) {
```

- [ ] **Step 3: Passar as novas props para `ResultadosWindow` dentro de `ResultadosDesktopWrapper`**

Localizar (por volta da linha 295):
```tsx
  return (
    <ResultadosWindow
      resultado={resultado}
      onAbrirFicha={onAbrirFicha}
      loadingPagina={loading}
      onPaginar={handlePaginar}
    />
  )
```

Substituir por:
```tsx
  return (
    <ResultadosWindow
      resultado={resultado}
      onAbrirFicha={onAbrirFicha}
      loadingPagina={loading}
      onPaginar={handlePaginar}
      enrichedMap={enrichedMap}
      enrichingCnpjs={enrichingCnpjs}
      buscaParams={buscaParams}
    />
  )
```

- [ ] **Step 4: Adicionar `useEnrichment` em `CnaeDesktopOS` e atualizar estados**

Localizar em `CnaeDesktopOS` (linha 304):
```typescript
function CnaeDesktopOS({ onLogout }: { onLogout?: () => void }) {
  const [windows, setWindows] = useState<OsWindow[]>([])
  const [lastResult, setLastResult] = useState<BuscaResult | null>(null)
  const [lastParams, setLastParams] = useState<BuscaParams | null>(null)
```

Substituir por:
```typescript
function CnaeDesktopOS({ onLogout }: { onLogout?: () => void }) {
  const [windows, setWindows] = useState<OsWindow[]>([])
  const [lastResult, setLastResult] = useState<BuscaResult | null>(null)
  const [lastParams, setLastParams] = useState<BuscaParams | null>(null)
  const { enrich, enrichedMap, enrichingCnpjs } = useEnrichment()
```

- [ ] **Step 5: Atualizar `openResultados` para usar enriquecimento e passar novas props**

Localizar o callback `openResultados` (linha ~385). Substituir **o conteúdo da função `paginar`** para usar todos os campos de `BuscaParams`, e atualizar o JSX do `ResultadosDesktopWrapper`:

```typescript
  const openResultados = useCallback((result: BuscaResult, params: BuscaParams) => {
    // Disparar enriquecimento em background
    enrich(result.empresas)

    const paginar = async (pagina: number) => {
      const p = lastParamsRef.current
      if (!p) return
      const cnaes = (p.cnae ?? '').split(/[,\s]+/).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(Boolean)
      const porPagina = p.porPagina ?? 50

      const payload: Record<string, unknown> = {
        cnaes,
        inicio: (pagina - 1) * porPagina,
        quantidade: porPagina,
      }
      if (p.uf) payload.estados = [p.uf.toUpperCase()]
      if (p.cnpjs) payload.cnpjs = p.cnpjs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
      if (p.termosBusca) payload.termos_busca = p.termosBusca.split(',').map(t => ({ termo: t.trim(), tipo: p.termoBuscaEm ?? 'A' }))
      if (p.incluirCnaesSecundarios) payload.incluir_cnaes_secundarios = true
      if (p.somenteMatrizes) payload.somente_matrizes = true
      if (p.capitalSocialMinimo) payload.capital_social_minimo = p.capitalSocialMinimo
      if (p.capitalSocialMaximo) payload.capital_social_maximo = p.capitalSocialMaximo
      if (p.simplesNacional === 'apenas') payload.simples_nacional = true
      if (p.simplesNacional === 'excluir') payload.simples_nacional = false
      if (p.mei === 'apenas') payload.mei = true
      if (p.mei === 'excluir') payload.mei = false
      if (p.telefoneObrigatorio) payload.telefone_obrigatorio = true
      if (p.emailObrigatorio) payload.email_obrigatorio = true
      if (p.dataInicio) payload.data_inicio = p.dataInicio
      if (p.dataFim) payload.data_fim = p.dataFim

      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: BuscaResult = await res.json()
      setLastResult(data)
      enrich(data.empresas)
      openResultadosRef.current(data, lastParamsRef.current ?? p)
    }

    upsertWindow('resultados', {
      title: `resultados.cnae — ${result.total.toLocaleString('pt-BR')} empresas`,
      icon: <FileText size={13} color="#d97706" />,
      width: 900,
      height: 560,
      content: (
        <ResultadosDesktopWrapper
          resultado={result}
          onAbrirFicha={(empresa: Empresa) => openFichaRef.current(empresa.cnpj, empresa)}
          onPaginar={paginar}
          enrichedMap={enrichedMap}
          enrichingCnpjs={enrichingCnpjs}
          buscaParams={params}
        />
      ),
    })
  }, [upsertWindow, enrich, enrichedMap, enrichingCnpjs])
```

- [ ] **Step 6: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Se houver erro de dependência em `useCallback` (o `enrich` não existe no escopo do `openResultados` por causa do `useEnrichment` chamado mais tarde), verificar que `useEnrichment` está chamado antes dos callbacks. A ordem correta em `CnaeDesktopOS` é: estados → `useEnrichment()` → refs → callbacks.

- [ ] **Step 7: Commit**

```bash
git add components/CnaeDesktop.tsx
git commit -m "feat: wire useEnrichment in CnaeDesktop, expand pagination payload to all BuscaParams"
```

---

## Task 7: Atualizar `components/MobileLayout.tsx`

**Files:**
- Modify: `components/MobileLayout.tsx`

Mesma integração do `useEnrichment` que o Task 6.

- [ ] **Step 1: Adicionar import de `useEnrichment`**

Localizar no topo do arquivo:
```typescript
import type { Empresa, BuscaResult, BuscaParams } from '@/types/empresa'
```

Adicionar após:
```typescript
import { useEnrichment } from '@/hooks/useEnrichment'
```

- [ ] **Step 2: Adicionar `useEnrichment` na função principal do MobileLayout**

Localizar a função principal `MobileLayout` e adicionar o hook logo após os `useState`s iniciais:

```typescript
  const { enrich, enrichedMap, enrichingCnpjs } = useEnrichment()
```

- [ ] **Step 3: Chamar `enrich` após receber resultados da busca**

Localizar o handler de resultados em `MobileLayout` que chama `setResultado`. Será algo como:
```typescript
onResultados={(result, params) => {
  setResultado(result)
  setCurrentParams(params)
  setTab('resultados')
}}
```

Atualizar para também chamar `enrich`:
```typescript
onResultados={(result, params) => {
  setResultado(result)
  setCurrentParams(params)
  enrich(result.empresas)
  setTab('resultados')
}}
```

- [ ] **Step 4: Passar `enrichedMap`, `enrichingCnpjs` e `buscaParams` para `ResultadosWindow`**

Localizar o JSX onde `ResultadosWindow` é renderizado em `MobileLayout` e adicionar as props:
```tsx
<ResultadosWindow
  resultado={resultado}
  onAbrirFicha={...}
  onPaginar={...}
  enrichedMap={enrichedMap}
  enrichingCnpjs={enrichingCnpjs}
  buscaParams={currentParams ?? undefined}
/>
```

- [ ] **Step 5: Verificar compilação completa e testar**

```bash
npx tsc --noEmit 2>&1
npm run build 2>&1 | tail -20
```

Esperado: build limpo sem erros. Se houver erros de tipo relacionados ao `enrichedMap` sendo `Map` (que não é serializável), confirmar que nunca está sendo passado como prop de Server Component — está sempre em Client Components, o que é correto.

- [ ] **Step 6: Commit final**

```bash
git add components/MobileLayout.tsx
git commit -m "feat: wire useEnrichment in MobileLayout for progressive CNPJ enrichment"
```

---

## Self-Review

**Spec coverage check:**

| Requisito do spec | Task que implementa |
|------------------|---------------------|
| BuscaWindow — 4 abas com todos os filtros | Task 3 |
| ResultadosWindow — clicar na linha abre FichaWindow | Task 4 (Step 4) |
| Enriquecimento BrasilAPI em lotes de 10 | Task 2 (`useEnrichment`) |
| Exibição progressiva enquanto enriquece | Task 4 (Steps 5, 6) |
| Filtro de situação cadastral frontend | Task 4 (Steps 3, 6) |
| FichaWindow usa dados pré-carregados | Task 5 |
| Tipo `Empresa.enriquecida` | Task 1 |
| BuscaParams expandido | Task 1 |
| Paginação com novos params | Task 6 (Step 5) |
| Filtros de porte e município frontend | Task 4 (Step 3) |

**Placeholder scan:** nenhum TBD ou TODO encontrado.

**Type consistency:**
- `enrichedMap: Map<string, Empresa>` — consistente em Tasks 2, 4, 6, 7
- `enrichingCnpjs: Set<string>` — consistente em Tasks 2, 4, 6, 7
- `buscaParams: BuscaParams` — consistente em Tasks 3, 4, 6, 7
- `enrich(empresas: Empresa[])` — definido em Task 2, chamado em Tasks 6 e 7
- `empresa.enriquecida` — adicionado em Task 1, setado em Task 2, checado em Task 5
