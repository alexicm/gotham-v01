'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Terminal as TerminalIcon } from 'lucide-react'
import type { Empresa, BuscaResult } from '@/types/empresa'
import { formatCNPJ, formatCapital } from '@/lib/formatters'
import { cn } from '@/lib/cn'

interface Line {
  type: 'input' | 'output' | 'error' | 'success' | 'dim' | 'accent'
  text: string
}

interface Props {
  open: boolean
  onClose: () => void
  onAbrirBusca?: () => void
  onResultados?: (result: BuscaResult) => void
  onAbrirFicha?: (cnpj: string) => void
}

const NEOFETCH: Line[] = [
  { type: 'accent', text: '  ██████╗  ██████╗ ████████╗██╗  ██╗ █████╗ ███╗   ███╗' },
  { type: 'accent', text: ' ██╔════╝ ██╔═══██╗╚══██╔══╝██║  ██║██╔══██╗████╗ ████║' },
  { type: 'accent', text: ' ██║  ███╗██║   ██║   ██║   ███████║███████║██╔████╔██║' },
  { type: 'accent', text: ' ██║   ██║██║   ██║   ██║   ██╔══██║██╔══██║██║╚██╔╝██║' },
  { type: 'accent', text: ' ╚██████╔╝╚██████╔╝   ██║   ██║  ██║██║  ██║██║ ╚═╝ ██║' },
  { type: 'accent', text: '  ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝' },
  { type: 'dim', text: '  ──────────────────────────────────────────────────────' },
  { type: 'output', text: '  OS:       Gotham v1.0' },
  { type: 'output', text: '  Modulos:  Busca · CNPJ · Intelligence · Admin' },
  { type: 'output', text: '  Kernel:   Next.js 16 / React 19' },
  { type: 'output', text: '  Shell:    gotham-shell 1.0' },
  { type: 'dim', text: '  ──────────────────────────────────────────────────────' },
]

const HELP_GERAL: Line[] = [
  { type: 'accent', text: 'Comandos disponíveis:' },
  { type: 'output', text: '  buscar  --cnae=<cod> [--uf=UF] [--n=25]' },
  { type: 'output', text: '  ficha   <cnpj>      — ficha completa de um CNPJ' },
  { type: 'output', text: '  historico [--n=10]  — suas últimas N buscas' },
  { type: 'output', text: '  stats               — total de buscas e resultados' },
  { type: 'output', text: '  exportar            — baixa últimos resultados como CSV' },
  { type: 'output', text: '  limpar | cls        — limpa o terminal' },
  { type: 'output', text: '  help [comando]      — esta mensagem ou ajuda detalhada' },
]

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

export function TerminalOverlay({ open, onClose, onResultados, onAbrirFicha }: Props) {
  const [lines, setLines] = useState<Line[]>([
    ...NEOFETCH,
    { type: 'output', text: 'Digite "help" para ver os comandos.' },
    { type: 'dim', text: '' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastResultsRef = useRef<Empresa[]>([])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const addLines = useCallback((newLines: Line[]) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  async function handleBuscar(args: Record<string, string>) {
    const cnae = args['cnae']
    if (!cnae) {
      addLines([{ type: 'error', text: 'Erro: --cnae é obrigatório. Ex: buscar --cnae=6201500' }])
      return
    }
    const uf = args['uf'] ?? ''
    const n = args['n'] ?? '25'
    addLines([
      {
        type: 'dim',
        text: `Buscando CNAE ${cnae}${uf ? ` | UF: ${uf}` : ''}...`,
      },
    ])
    setLoading(true)
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
          { type: 'success', text: `Encontradas: ${total.toLocaleString('pt-BR')} · Exibindo ${empresas.length}` },
          { type: 'dim', text: '─'.repeat(60) },
          ...empresas.slice(0, 20).map(e => ({
            type: 'output' as const,
            text: `  ${formatCNPJ(e.cnpj)}  ${(e.nomeFantasia || e.razaoSocial).padEnd(35).slice(0, 35)}  ${e.uf}/${e.municipio}`,
          })),
          ...(empresas.length > 20
            ? [{ type: 'dim' as const, text: `  ... e mais ${empresas.length - 20} resultados.` }]
            : []),
          { type: 'dim', text: '─'.repeat(60) },
        ])
        lastResultsRef.current = empresas
        onResultados?.(data)
      }
    } catch {
      addLines([{ type: 'error', text: 'Falha na conexão com a API.' }])
    } finally {
      setLoading(false)
    }
  }

  async function handleFicha(cnpj: string) {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) {
      addLines([{ type: 'error', text: `CNPJ inválido: ${cnpj}.` }])
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
          { type: 'output', text: `  Situação:    ${data.situacao}` },
          { type: 'output', text: `  CNAE:        ${data.cnae} — ${data.descricaoCnae}` },
          { type: 'output', text: `  Município:   ${data.municipio}/${data.uf}` },
          { type: 'output', text: `  Capital:     ${formatCapital(data.capitalSocial)}` },
          { type: 'output', text: `  Email:       ${data.email || '—'}` },
          { type: 'dim', text: '─'.repeat(60) },
        ])
        onAbrirFicha?.(digits)
      }
    } catch {
      addLines([{ type: 'error', text: 'Falha na conexão.' }])
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
      const data: { historico?: { cnaes: string[]; total_resultados: number; criado_em: string }[]; error?: string } =
        await res.json()
      if (!res.ok) {
        addLines([{ type: 'error', text: `Erro: ${data.error}` }])
      } else if (!data.historico?.length) {
        addLines([{ type: 'dim', text: 'Nenhuma busca encontrada.' }])
      } else {
        addLines([
          { type: 'accent', text: `Últimas ${data.historico.length} buscas:` },
          { type: 'dim', text: '─'.repeat(60) },
          ...data.historico.map(h => ({
            type: 'output' as const,
            text: `  ${new Date(h.criado_em).toLocaleDateString('pt-BR')}  CNAE ${h.cnaes.join(', ')}  →  ${h.total_resultados.toLocaleString('pt-BR')}`,
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

  function handleExportar() {
    const results = lastResultsRef.current
    if (!results.length) {
      addLines([{ type: 'error', text: 'Nenhum resultado. Execute "buscar" primeiro.' }])
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
      ].join(','),
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gotham-export-${Date.now()}.csv`
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

    if (command === 'help' || command === 'ajuda') {
      addLines(HELP_GERAL)
    } else if (command === 'neofetch') {
      addLines(NEOFETCH)
    } else if (command === 'limpar' || command === 'clear' || command === 'cls') {
      setLines([])
    } else if (command === 'buscar' || command === 'search') {
      await handleBuscar(args)
    } else if (command === 'ficha') {
      await handleFicha(tokens[0] ?? args['_'] ?? '')
    } else if (command === 'historico') {
      await handleHistorico(args)
    } else if (command === 'stats') {
      addLines([{ type: 'dim', text: 'Carregando estatísticas...' }])
      setLoading(true)
      try {
        const res = await fetch('/api/terminal/stats')
        const data: { total_buscas?: number; total_resultados?: number; primeira_busca?: string | null; error?: string } =
          await res.json()
        if (!res.ok) addLines([{ type: 'error', text: `Erro: ${data.error}` }])
        else {
          const primeiraDt = data.primeira_busca
            ? new Date(data.primeira_busca).toLocaleDateString('pt-BR')
            : '—'
          addLines([
            { type: 'accent', text: 'Suas estatísticas:' },
            { type: 'dim', text: '─'.repeat(40) },
            { type: 'output', text: `  Buscas:     ${(data.total_buscas ?? 0).toLocaleString('pt-BR')}` },
            { type: 'output', text: `  Empresas:   ${(data.total_resultados ?? 0).toLocaleString('pt-BR')}` },
            { type: 'output', text: `  Primeira:   ${primeiraDt}` },
            { type: 'dim', text: '─'.repeat(40) },
          ])
        }
      } catch {
        addLines([{ type: 'error', text: 'Falha na conexão.' }])
      } finally {
        setLoading(false)
      }
    } else if (command === 'exportar') {
      handleExportar()
    } else if (command === 'sair' || command === 'exit' || command === 'q') {
      onClose()
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

  if (!open) return null

  const colorMap: Record<Line['type'], string> = {
    input: 'text-info',
    output: 'text-primary',
    error: 'text-critical',
    success: 'text-success',
    dim: 'text-muted/60',
    accent: 'text-warning',
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8 animate-gtm-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[820px] h-[80vh] rounded-[4px] border border-border bg-background shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-9 border-b border-border bg-surface flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TerminalIcon size={12} className="text-success" />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
              terminal · gotham-shell
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors"
            aria-label="Fechar terminal"
          >
            <X size={13} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-[1.55] bg-background"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((l, i) => (
            <div key={i} className={cn('whitespace-pre-wrap break-all', colorMap[l.type])}>
              {l.text}
            </div>
          ))}
          {loading && (
            <div className="text-muted animate-gtm-pulse">▊</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border flex items-center gap-2 px-3 h-10 bg-surface flex-shrink-0">
          <span className="text-info font-mono text-[13px] flex-shrink-0">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder={loading ? 'aguardando...' : 'digite um comando — ESC para fechar'}
            className="flex-1 bg-transparent border-none outline-none text-primary font-mono text-[13px] placeholder:text-muted/50 caret-info"
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
