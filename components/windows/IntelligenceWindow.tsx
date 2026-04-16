'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Trash2, Search, X, RefreshCw } from 'lucide-react'
import type { Empresa } from '@/types/empresa'
import type {
  RespostaInteligencia,
  PedidoAutorizacao,
  FonteResposta,
} from '@/types/intelligence'
import { AuthGate } from '@/components/intelligence/AuthGate'
import { formatCNPJ } from '@/lib/formatters'

interface Props {
  empresa?: Empresa
}

interface ConsultaLocal {
  id: string
  pergunta: string
  status: 'carregando' | 'aguardando_auth' | 'concluido' | 'erro'
  resposta?: RespostaInteligencia
  pedidoAutorizacao?: PedidoAutorizacao
  erro?: string
}

const FONTE_LABELS: Record<FonteResposta, { label: string; cor: string }> = {
  cache: { label: 'cache', cor: '#4ade80' },
  brasilapi: { label: 'receita fed.', cor: '#60a5fa' },
  openai: { label: 'openai', cor: '#a78bfa' },
  apify_maps: { label: 'google maps', cor: '#fbbf24' },
  apify_linkedin: { label: 'linkedin', cor: '#38bdf8' },
  apify_web: { label: 'site', cor: '#fb923c' },
  apify_search: { label: 'google', cor: '#f472b6' },
  sintetizado: { label: 'múltiplas', cor: '#f472b6' },
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

export function IntelligenceWindow({ empresa: empresaInicial }: Props) {
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
    // Detectar CNPJ no input — buscar empresa automaticamente
    const cnpjDetectado = extrairCNPJ(pergunta)
    if (cnpjDetectado && !empresa) {
      await buscarEmpresaPorCNPJ(cnpjDetectado)
      return
    }
    if (cnpjDetectado && empresa && cnpjDetectado !== empresa.cnpj.replace(/\D/g, '')) {
      await buscarEmpresaPorCNPJ(cnpjDetectado)
      return
    }

    if (!empresa) return

    const id = consultaId ?? crypto.randomUUID()

    if (!consultaId) {
      setConsultas((prev) => [
        ...prev,
        { id, pergunta, status: 'carregando' },
      ])
    } else {
      setConsultas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'carregando', pedidoAutorizacao: undefined } : c)),
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
        setConsultas((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status: 'erro', erro: data.error ?? 'Erro desconhecido' } : c,
          ),
        )
        return
      }

      if (data.pedidoAutorizacao) {
        setConsultas((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'aguardando_auth',
                  pedidoAutorizacao: data.pedidoAutorizacao,
                  resposta: data.resposta,
                }
              : c,
          ),
        )
        return
      }

      setConsultas((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'concluido', resposta: data.resposta } : c,
        ),
      )
    } catch {
      setConsultas((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'erro', erro: 'Falha na conexão com a API' } : c,
        ),
      )
    }
  }

  function handleEnviar() {
    const texto = input.trim()
    if (!texto) return

    // Se não tem empresa, tenta detectar CNPJ no input
    const cnpjDetectado = extrairCNPJ(texto)
    if (cnpjDetectado && !empresa) {
      buscarEmpresaPorCNPJ(cnpjDetectado)
      setInput('')
      return
    }
    if (cnpjDetectado && empresa && cnpjDetectado !== empresa.cnpj.replace(/\D/g, '')) {
      buscarEmpresaPorCNPJ(cnpjDetectado)
      setInput('')
      return
    }

    if (!empresa) return
    enviarConsulta(texto)
    setInput('')
  }

  function handleTrocarEmpresa() {
    setEmpresa(null)
    setConsultas([])
    setCnpjInput('')
    setErroCnpj('')
  }

  function handleAutorizar(consultaId: string, pergunta: string, proximas: boolean) {
    if (proximas) setAutorizarProximas(true)
    enviarConsulta(pergunta, true, consultaId)
  }

  function handleRecusar(consultaId: string) {
    setConsultas((prev) =>
      prev.map((c) => (c.id === consultaId ? { ...c, status: 'concluido' } : c)),
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #ddd0b0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <Brain size={16} color="#a78bfa" />
        {empresa ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#7a6a4a' }}>empresa selecionada</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#2c2416',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {empresa.nomeFantasia || empresa.razaoSocial}
            </div>
            <div style={{ fontSize: 10, color: '#a89868', fontFamily: 'monospace' }}>
              {formatCNPJ(empresa.cnpj)}
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#a89868', flex: 1 }}>
            Digite um CNPJ para começar
          </span>
        )}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {empresa && (
            <button
              onClick={handleTrocarEmpresa}
              title="Trocar empresa"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#7a6a4a',
                padding: 4,
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          )}
          {consultas.length > 0 && (
            <button
              onClick={() => setConsultas([])}
              title="Limpar histórico"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#7a6a4a',
                padding: 4,
                display: 'flex',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Busca CNPJ — aparece quando não há empresa */}
      {!empresa && (
        <div style={{ padding: 14, borderBottom: '1px solid #ddd0b0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={13}
                color="#a89868"
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                value={cnpjInput}
                onChange={(e) => { setCnpjInput(e.target.value); setErroCnpj('') }}
                onKeyDown={(e) => e.key === 'Enter' && buscarEmpresaPorCNPJ(cnpjInput)}
                placeholder="Digite o CNPJ (ex: 00.000.000/0001-91)"
                disabled={buscandoCnpj}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 32px',
                  background: '#fdf9f0',
                  border: erroCnpj ? '1px solid #fca5a5' : '1px solid #c8b888',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#2c2416',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <button
              onClick={() => buscarEmpresaPorCNPJ(cnpjInput)}
              disabled={buscandoCnpj || !cnpjInput.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 14px',
                fontSize: 12,
                borderRadius: 8,
                background: cnpjInput.trim() && !buscandoCnpj ? '#fbbf24' : '#ede8da',
                color: cnpjInput.trim() && !buscandoCnpj ? '#1a1208' : '#a89868',
                border: '1px solid #c8b888',
                cursor: cnpjInput.trim() && !buscandoCnpj ? 'pointer' : 'not-allowed',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              {buscandoCnpj ? <RefreshCw size={13} style={{ animation: 'ficha-spin 0.7s linear infinite' }} /> : <Search size={13} />}
              Buscar
            </button>
          </div>
          {erroCnpj && (
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>{erroCnpj}</div>
          )}
        </div>
      )}

      {/* Conteúdo */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 14,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Estado vazio sem empresa */}
        {!empresa && consultas.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <Brain size={32} color="#c8b888" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#7a6a4a', margin: '0 0 6px' }}>
              Módulo de Inteligência
            </p>
            <p style={{ fontSize: 11, color: '#a89868', margin: 0 }}>
              Busque uma empresa pelo CNPJ acima ou digite um CNPJ no campo de mensagem
            </p>
          </div>
        )}

        {/* Perguntas sugeridas com empresa carregada */}
        {consultas.length === 0 && empresa && (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <p style={{ fontSize: 12, color: '#a89868', marginBottom: 16 }}>
              perguntas sugeridas
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              {PERGUNTAS_SUGERIDAS.map((p) => (
                <button
                  key={p}
                  onClick={() => enviarConsulta(p)}
                  style={{
                    fontSize: 11,
                    padding: '5px 12px',
                    borderRadius: 20,
                    background: '#ede8da',
                    border: '1px solid #c8b888',
                    color: '#7a6a4a',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {consultas.map((consulta) => (
          <div key={consulta.id} style={{ marginBottom: 16 }}>
            {/* Pergunta */}
            <div
              style={{
                padding: '8px 10px',
                background: '#ede8da',
                borderRadius: '8px 8px 0 0',
                fontSize: 12,
                color: '#2c2416',
                borderLeft: '3px solid #fbbf24',
                fontWeight: 500,
              }}
            >
              {consulta.pergunta}
            </div>

            {/* Loading */}
            {consulta.status === 'carregando' && (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: 11,
                  color: '#7a6a4a',
                  borderRadius: '0 0 8px 8px',
                  border: '1px solid #e8e0cc',
                  borderTop: 'none',
                  fontFamily: 'monospace',
                }}
              >
                <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>
                  $ processando consulta...
                </span>
              </div>
            )}

            {/* Auth Gate */}
            {consulta.status === 'aguardando_auth' && consulta.pedidoAutorizacao && (
              <div style={{ borderTop: 'none', marginTop: -1 }}>
                <AuthGate
                  pedido={consulta.pedidoAutorizacao}
                  onAutorizar={(proximas) =>
                    handleAutorizar(consulta.id, consulta.pergunta, proximas)
                  }
                  onRecusar={() => handleRecusar(consulta.id)}
                />
              </div>
            )}

            {/* Erro */}
            {consulta.status === 'erro' && (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: 12,
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                }}
              >
                {consulta.erro}
              </div>
            )}

            {/* Resposta */}
            {consulta.resposta && consulta.status === 'concluido' && (
              <RespostaCard resposta={consulta.resposta} />
            )}
          </div>
        ))}
      </div>

      {/* Input — sempre visível, aceita CNPJ ou pergunta */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid #ddd0b0',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
          placeholder={
            empresa
              ? 'pergunte sobre a empresa ou digite outro CNPJ...'
              : 'digite um CNPJ ou busque acima...'
          }
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: 12,
            borderRadius: 6,
            background: '#fdf9f0',
            border: '1px solid #c8b888',
            color: '#2c2416',
            fontFamily: 'monospace',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleEnviar}
          disabled={!input.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 14px',
            fontSize: 12,
            borderRadius: 6,
            background: input.trim() ? '#fbbf24' : '#ede8da',
            color: input.trim() ? '#1a1208' : '#a89868',
            border: '1px solid #c8b888',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          <Send size={12} />
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes ficha-spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

function RespostaCard({ resposta }: { resposta: RespostaInteligencia }) {
  const fonte = FONTE_LABELS[resposta.fonte] ?? { label: resposta.fonte, cor: '#7a6a4a' }

  return (
    <div
      style={{
        padding: '10px 12px',
        border: '1px solid #e8e0cc',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        background: '#faf8f2',
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: '#2c2416',
          lineHeight: 1.6,
          margin: '0 0 8px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {resposta.resposta}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            padding: '2px 7px',
            borderRadius: 4,
            fontWeight: 600,
            background: `${fonte.cor}22`,
            color: fonte.cor,
            border: `1px solid ${fonte.cor}44`,
            fontFamily: 'monospace',
          }}
        >
          {fonte.label}
        </span>
        <span style={{ fontSize: 10, color: '#a89868', fontFamily: 'monospace' }}>
          confiança {Math.round(resposta.confianca * 100)}%
        </span>
        <span
          style={{
            fontSize: 10,
            color: '#a89868',
            marginLeft: 'auto',
            fontFamily: 'monospace',
          }}
        >
          {resposta.tempoMs}ms
        </span>
      </div>
    </div>
  )
}
