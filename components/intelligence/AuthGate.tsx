'use client'

import { useState } from 'react'
import type { PedidoAutorizacao } from '@/types/intelligence'

const ACTOR_LABELS: Record<string, string> = {
  google_maps: 'Google Maps',
  linkedin_company: 'LinkedIn',
  web_crawler: 'Site da empresa',
  google_search: 'Google Search',
}

interface Props {
  pedido: PedidoAutorizacao
  onAutorizar: (autorizarProximas: boolean) => void
  onRecusar: () => void
}

export function AuthGate({ pedido, onAutorizar, onRecusar }: Props) {
  const [autorizarProximas, setAutorizarProximas] = useState(false)

  const formatTempo = (s: number) => (s < 60 ? `~${s}s` : `~${Math.round(s / 60)}min`)

  return (
    <div
      style={{
        background: '#faf8f2',
        border: '1px solid #c8b888',
        borderRadius: 8,
        padding: 14,
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
        <span style={{ fontSize: 12, color: '#2c2416', fontWeight: 600 }}>
          autorização necessária
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#7a6a4a', marginBottom: 12, margin: '0 0 12px' }}>
        Para responder <em>&quot;{pedido.pergunta}&quot;</em> sobre{' '}
        <strong>{pedido.razaoSocial}</strong>, preciso buscar dados externos.
      </p>

      <div
        style={{
          marginBottom: 12,
          borderTop: '1px solid #e8e0cc',
          paddingTop: 10,
        }}
      >
        {pedido.custos.map((custo) => (
          <div
            key={custo.actor}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              borderBottom: '1px solid #f0e8d8',
            }}
          >
            <span style={{ fontSize: 11, color: '#2c2416' }}>
              {ACTOR_LABELS[custo.actor] ?? custo.actor}
            </span>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: '#7a6a4a' }}>{formatTempo(custo.tempoEstimadoS)}</span>
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                {custo.creditosEstimados.toFixed(3)} créditos
              </span>
            </div>
          </div>
        ))}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 8,
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 12, color: '#2c2416', fontWeight: 600 }}>total</span>
          <span style={{ fontSize: 13, color: '#d97706', fontWeight: 700 }}>
            ~{pedido.custoTotalEstimado.toFixed(3)} créditos
          </span>
        </div>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          marginBottom: 12,
          fontSize: 11,
          color: '#7a6a4a',
        }}
      >
        <input
          type="checkbox"
          checked={autorizarProximas}
          onChange={(e) => setAutorizarProximas(e.target.checked)}
        />
        autorizar automaticamente para próximas consultas desta sessão
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onAutorizar(autorizarProximas)}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 6,
            fontSize: 12,
            background: '#fbbf24',
            color: '#1a1208',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          autorizar busca
        </button>
        <button
          onClick={onRecusar}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            fontSize: 12,
            background: 'transparent',
            color: '#7a6a4a',
            border: '1px solid #c8b888',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          pular
        </button>
      </div>
    </div>
  )
}
