'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Empresa, BuscaResult } from '@/types/empresa'
import { formatCNPJ, formatCapital } from '@/lib/formatters'

interface Line {
  type: 'input' | 'output' | 'error' | 'success' | 'dim' | 'amber'
  text: string
}

interface Props {
  onAbrirBusca?: () => void
  onResultados?: (result: BuscaResult) => void
  onAbrirFicha?: (cnpj: string) => void
}

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

function parseArgs(tokens: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  for (const t of tokens) {
    if (t.startsWith('--')) {
      const [k, ...rest] = t.slice(2).split('=')
      args[k] = rest.join('=')
    } else {
      args['_'] = t
    }
  }
  return args
}

export function CnaeTerminalWindow({ onAbrirBusca, onResultados, onAbrirFicha }: Props) {
  const [lines, setLines] = useState<Line[]>([
    ...NEOFETCH,
    { type: 'dim', text: '' },
    { type: 'output', text: 'Digite "help" para ver os comandos.' },
    { type: 'dim', text: '' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastResultsRef = useRef<import('@/types/empresa').Empresa[]>([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const addLines = useCallback((newLines: Line[]) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  async function handleBuscar(args: Record<string, string>) {
    const cnae = args['cnae']
    if (!cnae) {
      addLines([{ type: 'error', text: 'Erro: --cnae e obrigatorio. Ex: buscar --cnae=6201500' }])
      return
    }
    const uf = args['uf'] ?? ''
    const municipio = args['municipio'] ?? ''
    const porte = args['porte'] ?? ''
    const n = args['n'] ?? '25'

    addLines([{ type: 'dim', text: `Buscando CNAE ${cnae}${uf ? ` | UF: ${uf}` : ''}${municipio ? ` | Municipio: ${municipio}` : ''}...` }])
    setLoading(true)

    // Converte string de CNAEs em array de numeros para a API Lista CNAE (POST)
    const cnaes = cnae.split(/[,\s]+/).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(Boolean)
    const payload: Record<string, unknown> = {
      cnaes,
      inicio: 0,
      quantidade: parseInt(n, 10) || 25,
    }
    if (uf) payload.estados = [uf.toUpperCase()]
    if (args['simples']) payload.simples_nacional = args['simples'].toUpperCase() === 'S'
    if (args['mei']) payload.mei = args['mei'].toUpperCase() === 'S'

    try {
      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: BuscaResult & { error?: string } = await res.json()

      if (!res.ok) {
        addLines([{ type: 'error', text: `Erro: ${data.error}` }])
      } else {
        const { empresas, total } = data
        addLines([
          { type: 'success', text: `Encontradas: ${total.toLocaleString('pt-BR')} empresas. Exibindo ${empresas.length}:` },
          { type: 'dim', text: '─'.repeat(60) },
          ...empresas.slice(0, 20).map(e => ({
            type: 'output' as const,
            text: `  ${formatCNPJ(e.cnpj)}  ${(e.nomeFantasia || e.razaoSocial).padEnd(35).slice(0, 35)}  ${e.uf}/${e.municipio}`,
          })),
          ...(empresas.length > 20 ? [{ type: 'dim' as const, text: `  ... e mais ${empresas.length - 20} resultados. Abra a janela de resultados.` }] : []),
          { type: 'dim', text: '─'.repeat(60) },
        ])
        lastResultsRef.current = empresas
        onResultados?.({ empresas, total, pagina: data.pagina, ultimaPagina: data.ultimaPagina })
      }
    } catch {
      addLines([{ type: 'error', text: 'Falha na conexao com a API.' }])
    } finally {
      setLoading(false)
    }
  }

  async function handleFicha(cnpj: string) {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) {
      addLines([{ type: 'error', text: `CNPJ invalido: ${cnpj}. Use 14 digitos.` }])
      return
    }
    addLines([{ type: 'dim', text: `Consultando CNPJ ${formatCNPJ(digits)}...` }])
    setLoading(true)
    try {
      const res = await fetch(`/api/cnpj/${digits}`)
      const data: Empresa & { error?: string } = await res.json()
      if (!res.ok) {
        addLines([{ type: 'error', text: `Erro: ${data.error}` }])
      } else {
        addLines([
          { type: 'success', text: `Ficha: ${data.razaoSocial}` },
          { type: 'dim', text: '─'.repeat(60) },
          { type: 'output', text: `  CNPJ:        ${formatCNPJ(data.cnpj)}` },
          { type: 'output', text: `  Situacao:    ${data.situacao}` },
          { type: 'output', text: `  CNAE:        ${data.cnae} — ${data.descricaoCnae}` },
          { type: 'output', text: `  Municipio:   ${data.municipio}/${data.uf}` },
          { type: 'output', text: `  Capital:     ${formatCapital(data.capitalSocial)}` },
          { type: 'output', text: `  Email:       ${data.email || '—'}` },
          { type: 'dim', text: '─'.repeat(60) },
          { type: 'dim', text: 'Para ver a ficha completa, use o botao "Ficha" nos resultados.' },
        ])
        onAbrirFicha?.(digits)
      }
    } catch {
      addLines([{ type: 'error', text: 'Falha na conexao.' }])
    } finally {
      setLoading(false)
    }
  }

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

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const v = input.trim()
      setInput('')
      execute(v)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      setInput(history[idx] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? '' : history[idx])
    }
  }

  const colorMap: Record<Line['type'], string> = {
    input: '#fbbf24',
    output: '#d4c4a8',
    error: '#f87171',
    success: '#4ade80',
    dim: '#7a6a4a',
    amber: '#fbbf24',
  }

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1208', fontFamily: 'monospace' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 12, lineHeight: 1.6, color: colorMap[l.type], whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {l.text}
          </div>
        ))}
        {loading && (
          <div style={{ fontSize: 12, color: '#7a6a4a' }}>
            <span style={{ animation: 'blink 1s step-end infinite' }}>&#9608;</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #2c2010', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#fbbf24', fontSize: 13, flexShrink: 0 }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
          placeholder={loading ? 'aguardando...' : 'digite um comando...'}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#d4c4a8',
            fontSize: 13,
            fontFamily: 'monospace',
            caretColor: '#fbbf24',
          }}
          autoFocus
        />
      </div>
      <style>{`
        @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
      `}</style>
    </div>
  )
}
