'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Trash2 } from 'lucide-react'
import type { Empresa } from '@/types/empresa'
import type {
  RespostaInteligencia,
  PedidoAutorizacao,
  FonteResposta,
} from '@/types/intelligence'
import { AuthGate } from '@/components/intelligence/AuthGate'

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
  'Quantos funcionários tem no LinkedIn?',
  'Qual a nota no Google Maps?',
  'O site está ativo?',
  'Está contratando agora?',
  'Qual o porte comparado ao setor?',
]

export function IntelligenceWindow({ empresa }: Props) {
  const [consultas, setConsultas] = useState<ConsultaLocal[]>([])
  const [input, setInput] = useState('')
  const [autorizarProximas, setAutorizarProximas] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [consultas])

  async function enviarConsulta(pergunta: string, autorizado = false, consultaId?: string) {
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
    if (!input.trim() || !empresa) return
    enviarConsulta(input.trim())
    setInput('')
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
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#a89868', flex: 1 }}>
            Abra uma ficha e clique em &quot;Analisar com IA&quot;
          </span>
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

      {/* Input */}
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
          disabled={!empresa}
          placeholder={
            empresa ? 'pergunte sobre a empresa...' : 'selecione uma empresa primeiro'
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
          disabled={!empresa || !input.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 14px',
            fontSize: 12,
            borderRadius: 6,
            background:
              input.trim() && empresa ? '#fbbf24' : '#ede8da',
            color:
              input.trim() && empresa ? '#1a1208' : '#a89868',
            border: '1px solid #c8b888',
            cursor:
              input.trim() && empresa ? 'pointer' : 'not-allowed',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          <Send size={12} />
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
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
