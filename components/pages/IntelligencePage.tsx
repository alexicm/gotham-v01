'use client'

import { useEffect, useRef, useState } from 'react'
import { Brain, Send, Trash2, Search, X, RefreshCw } from 'lucide-react'
import type { Empresa } from '@/types/empresa'
import type { RespostaInteligencia, PedidoAutorizacao, FonteResposta } from '@/types/intelligence'
import { AuthGate } from '@/components/intelligence/AuthGate'
import { formatCNPJ } from '@/lib/formatters'
import { Panel } from '@/components/ui-pal/Card'
import { Button } from '@/components/ui-pal/Button'
import { Input } from '@/components/ui-pal/Input'
import { Spinner } from '@/components/ui-pal/Spinner'
import { Badge } from '@/components/ui-pal/Badge'
import { cn } from '@/lib/cn'

const FONTE_LABELS: Record<FonteResposta, { label: string; variant: 'success' | 'info' | 'violet' | 'warning' | 'muted' }> = {
  cache: { label: 'cache', variant: 'success' },
  brasilapi: { label: 'receita federal', variant: 'info' },
  openai: { label: 'openai', variant: 'violet' },
  apify_maps: { label: 'google maps', variant: 'warning' },
  apify_linkedin: { label: 'linkedin', variant: 'info' },
  apify_web: { label: 'site', variant: 'warning' },
  apify_search: { label: 'google', variant: 'muted' },
  sintetizado: { label: 'web + análise', variant: 'success' },
}

const PERGUNTAS_SUGERIDAS = [
  'Qual a situação real desse negócio?',
  'Qual o porte comparado ao setor?',
  'Resuma os dados dessa empresa',
  'Quais os riscos de negociar com ela?',
  'Analise o quadro societário',
  'Essa empresa parece ativa de verdade?',
]

const CNPJ_REGEX = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$|^\d{14}$/

function extrairCNPJ(texto: string): string | null {
  const limpo = texto.trim()
  if (CNPJ_REGEX.test(limpo)) return limpo.replace(/\D/g, '')
  const match = texto.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{14}/)
  return match ? match[0].replace(/\D/g, '') : null
}

interface ConsultaLocal {
  id: string
  pergunta: string
  status: 'carregando' | 'aguardando_auth' | 'concluido' | 'erro'
  resposta?: RespostaInteligencia
  pedidoAutorizacao?: PedidoAutorizacao
  erro?: string
}

interface Props {
  empresaInicial?: Empresa
}

export function IntelligencePage({ empresaInicial }: Props) {
  const [empresa, setEmpresa] = useState<Empresa | null>(empresaInicial ?? null)
  const [consultas, setConsultas] = useState<ConsultaLocal[]>([])
  const [input, setInput] = useState('')
  const [autorizarProximas, setAutorizarProximas] = useState(false)
  const [cnpjInput, setCnpjInput] = useState('')
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [erroCnpj, setErroCnpj] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [consultas])

  async function buscarEmpresaPorCNPJ(cnpj: string) {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) {
      setErroCnpj('CNPJ deve ter 14 dígitos')
      return
    }
    setBuscandoCnpj(true)
    setErroCnpj('')
    try {
      const res = await fetch(`/api/cnpj/${digits}`)
      const data = await res.json()
      if (!res.ok) {
        setErroCnpj(data.error ?? 'CNPJ não encontrado')
        return
      }
      setEmpresa(data)
      setCnpjInput('')
      setConsultas([])
    } catch {
      setErroCnpj('Falha na conexão com a API')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  async function enviarConsulta(pergunta: string, autorizado = false, consultaId?: string) {
    const cnpjDetectado = extrairCNPJ(pergunta)
    if (cnpjDetectado && (!empresa || cnpjDetectado !== empresa.cnpj.replace(/\D/g, ''))) {
      await buscarEmpresaPorCNPJ(cnpjDetectado)
      return
    }
    if (!empresa) return

    const id = consultaId ?? crypto.randomUUID()
    if (!consultaId) {
      setConsultas(prev => [...prev, { id, pergunta, status: 'carregando' }])
    } else {
      setConsultas(prev =>
        prev.map(c => (c.id === id ? { ...c, status: 'carregando', pedidoAutorizacao: undefined } : c)),
      )
    }

    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta,
          empresa,
          autorizado: autorizado || autorizarProximas,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setConsultas(prev =>
          prev.map(c => (c.id === id ? { ...c, status: 'erro', erro: data.error ?? 'Erro desconhecido' } : c)),
        )
        return
      }

      if (data.pedidoAutorizacao) {
        setConsultas(prev =>
          prev.map(c =>
            c.id === id
              ? { ...c, status: 'aguardando_auth', pedidoAutorizacao: data.pedidoAutorizacao, resposta: data.resposta }
              : c,
          ),
        )
        return
      }

      setConsultas(prev =>
        prev.map(c => (c.id === id ? { ...c, status: 'concluido', resposta: data.resposta } : c)),
      )
    } catch {
      setConsultas(prev =>
        prev.map(c => (c.id === id ? { ...c, status: 'erro', erro: 'Falha na conexão com a API' } : c)),
      )
    }
  }

  function handleEnviar() {
    const texto = input.trim()
    if (!texto) return
    const cnpjDetectado = extrairCNPJ(texto)
    if (cnpjDetectado && (!empresa || cnpjDetectado !== empresa.cnpj.replace(/\D/g, ''))) {
      buscarEmpresaPorCNPJ(cnpjDetectado)
      setInput('')
      return
    }
    if (!empresa) return
    enviarConsulta(texto)
    setInput('')
  }

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 animate-gtm-fade-in">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Brain size={11} />
            INTELLIGENCE
          </span>
        }
        meta={
          empresa && (
            <span className="flex items-center gap-2">
              <span className="text-primary truncate max-w-[280px]">
                {empresa.nomeFantasia || empresa.razaoSocial}
              </span>
              <span className="text-muted/70">·</span>
              <span className="font-mono tabular">{formatCNPJ(empresa.cnpj)}</span>
              <button
                onClick={() => {
                  setEmpresa(null)
                  setConsultas([])
                }}
                className="text-muted hover:text-primary transition-colors"
                title="Trocar empresa"
              >
                <X size={11} />
              </button>
            </span>
          )
        }
        className="flex-1 min-h-0"
      >
        {!empresa && (
          <div className="border-b border-border p-3 flex gap-2 flex-shrink-0">
            <Input
              type="text"
              placeholder="Digite o CNPJ (ex: 00.000.000/0001-91)"
              value={cnpjInput}
              onChange={e => {
                setCnpjInput(e.target.value)
                setErroCnpj('')
              }}
              onKeyDown={e => e.key === 'Enter' && buscarEmpresaPorCNPJ(cnpjInput)}
              disabled={buscandoCnpj}
              invalid={!!erroCnpj}
              leftIcon={<Search size={13} />}
              mono
              containerClassName="flex-1"
            />
            <Button
              variant="primary"
              onClick={() => buscarEmpresaPorCNPJ(cnpjInput)}
              disabled={buscandoCnpj || !cnpjInput.trim()}
            >
              {buscandoCnpj ? <Spinner size={11} /> : <Search size={11} />}
              Buscar
            </Button>
          </div>
        )}

        {erroCnpj && (
          <div className="mx-3 mt-3 rounded-[2px] border border-critical/40 bg-critical/10 px-3 py-1.5 text-[11px] text-critical font-mono flex-shrink-0">
            ! {erroCnpj}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {!empresa && consultas.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <Brain size={32} className="text-muted/40" />
              <div>
                <p className="text-[13px] text-primary">Módulo de Inteligência</p>
                <p className="text-[11px] text-muted mt-1">
                  Busque uma empresa pelo CNPJ acima ou digite no chat abaixo
                </p>
              </div>
            </div>
          )}

          {empresa && consultas.length === 0 && (
            <div className="text-center py-6">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted font-mono mb-3">
                perguntas sugeridas
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {PERGUNTAS_SUGERIDAS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => enviarConsulta(p)}
                    className="text-[11px] px-3 h-7 rounded-[2px] border border-border bg-surface-2 text-muted hover:text-primary hover:border-border-strong transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {consultas.map(consulta => (
            <div key={consulta.id} className="rounded-[2px] border border-border overflow-hidden">
              <div className="bg-surface-2 px-3 py-2 border-l-2 border-l-info text-[12px] text-primary">
                {consulta.pergunta}
              </div>

              {consulta.status === 'carregando' && (
                <div className="px-3 py-2.5 text-[11px] text-muted font-mono animate-gtm-pulse">
                  $ processando consulta...
                </div>
              )}

              {consulta.status === 'aguardando_auth' && consulta.pedidoAutorizacao && (
                <AuthGate
                  pedido={consulta.pedidoAutorizacao}
                  onAutorizar={proximas => {
                    if (proximas) setAutorizarProximas(true)
                    enviarConsulta(consulta.pergunta, true, consulta.id)
                  }}
                  onRecusar={() =>
                    setConsultas(prev =>
                      prev.map(c => (c.id === consulta.id ? { ...c, status: 'concluido' } : c)),
                    )
                  }
                />
              )}

              {consulta.status === 'erro' && (
                <div className="px-3 py-2.5 bg-critical/10 text-[12px] text-critical font-mono">
                  ! {consulta.erro}
                </div>
              )}

              {consulta.resposta && consulta.status === 'concluido' && (
                <RespostaCard resposta={consulta.resposta} />
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border p-2 flex gap-2 flex-shrink-0">
          <Input
            type="text"
            placeholder={
              empresa
                ? 'pergunte sobre a empresa ou cole outro CNPJ...'
                : 'digite um CNPJ para começar...'
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEnviar()}
            mono
            containerClassName="flex-1"
          />
          <Button variant="primary" onClick={handleEnviar} disabled={!input.trim()}>
            <Send size={11} />
          </Button>
          {consultas.length > 0 && (
            <Button variant="ghost" onClick={() => setConsultas([])} title="Limpar histórico">
              <Trash2 size={11} />
            </Button>
          )}
        </div>
      </Panel>
    </div>
  )
}

function RespostaCard({ resposta }: { resposta: RespostaInteligencia }) {
  const fonte = FONTE_LABELS[resposta.fonte] ?? { label: resposta.fonte, variant: 'muted' as const }
  return (
    <div className="bg-surface px-3 py-3 space-y-2">
      <p className="text-[12px] text-primary leading-relaxed whitespace-pre-wrap">
        {resposta.resposta}
      </p>
      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono tabular text-muted">
        <Badge variant={fonte.variant} mono>{fonte.label}</Badge>
        <span>confiança {Math.round(resposta.confianca * 100)}%</span>
        <span className="ml-auto">{resposta.tempoMs}ms</span>
      </div>
    </div>
  )
}
