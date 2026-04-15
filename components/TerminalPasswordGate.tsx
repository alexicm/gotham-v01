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
