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
  { type: 'amber' as const, text: '   ██████╗███╗   ██╗ █████╗ ███████╗' },
  { type: 'amber' as const, text: '  ██╔════╝████╗  ██║██╔══██╗██╔════╝' },
  { type: 'amber' as const, text: '  ██║     ██╔██╗ ██║███████║█████╗  ' },
  { type: 'amber' as const, text: '  ██║     ██║╚██╗██║██╔══██║██╔══╝  ' },
  { type: 'amber' as const, text: '  ╚██████╗██║ ╚████║██║  ██║███████╗' },
  { type: 'amber' as const, text: '   ╚═════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝' },
  { type: 'dim' as const,   text: '  ────────────────────────────────────' },
  { type: 'output' as const, text: '  OS:       Gotham Search v1.0.0' },
  { type: 'output' as const, text: '  API:      Lista CNAE + BrasilAPI CNPJ' },
  { type: 'output' as const, text: '  Kernel:   Next.js 16 / React 19' },
  { type: 'output' as const, text: '  Shell:    cnae-shell 1.0' },
  { type: 'dim' as const,   text: '  ────────────────────────────────────' },
]

const HELP: Line[] = [
  { type: 'amber', text: 'Comandos disponiveis:' },
  { type: 'output', text: '  buscar --cnae=<cod> [--uf=<UF>] [--municipio=<nome>] [--porte=ME|EPP|DEMAIS] [--n=50]' },
  { type: 'output', text: '  ficha <cnpj>        -- consulta ficha completa de um CNPJ' },
  { type: 'output', text: '  janela busca        -- abre a janela de busca visual' },
  { type: 'output', text: '  neofetch            -- informacoes do sistema' },
  { type: 'output', text: '  limpar              -- limpa o terminal' },
  { type: 'output', text: '  ajuda               -- exibe esta mensagem' },
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

export function CnaeTerminalWindow({ onAbrirBusca, onResultados, onAbrirFicha }: Props) {
  const [lines, setLines] = useState<Line[]>([
    ...NEOFETCH,
    { type: 'dim', text: '' },
    { type: 'output', text: 'Digite "ajuda" para ver os comandos.' },
    { type: 'dim', text: '' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  async function execute(cmd: string) {
    const trimmed = cmd.trim()
    if (!trimmed) return
    addLines([{ type: 'input', text: `$ ${trimmed}` }])
    setHistory(h => [trimmed, ...h.slice(0, 49)])
    setHistIdx(-1)

    const [command, ...tokens] = trimmed.split(/\s+/)
    const args = parseArgs(tokens)

    if (command === 'ajuda' || command === 'help') {
      addLines(HELP)
    } else if (command === 'neofetch') {
      addLines(NEOFETCH)
    } else if (command === 'limpar' || command === 'clear') {
      setLines([])
    } else if (command === 'buscar' || command === 'search') {
      await handleBuscar(args)
    } else if (command === 'ficha') {
      const cnpj = tokens[0] ?? args['_'] ?? ''
      await handleFicha(cnpj)
    } else if (command === 'janela' || command === 'open') {
      const sub = tokens[0]?.toLowerCase()
      if (sub === 'busca') {
        onAbrirBusca?.()
        addLines([{ type: 'success', text: 'Janela de busca aberta.' }])
      } else {
        addLines([{ type: 'error', text: `Janela desconhecida: ${sub}` }])
      }
    } else {
      addLines([{ type: 'error', text: `Comando nao reconhecido: "${command}". Digite "ajuda".` }])
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
