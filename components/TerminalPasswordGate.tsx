'use client'

import { useState } from 'react'
import { Terminal, Lock } from 'lucide-react'
import { Button } from '@/components/ui-pal/Button'
import { Input } from '@/components/ui-pal/Input'
import { Spinner } from '@/components/ui-pal/Spinner'

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
    <div
      className="fixed inset-0 z-[200] bg-background/75 backdrop-blur-sm flex items-center justify-center p-4 animate-gtm-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[400px] rounded-[4px] border border-border bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-9 border-b border-border bg-surface-2 flex items-center px-3">
          <Lock size={11} className="text-warning mr-2" />
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
            ACESSO RESTRITO · TERMINAL
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-9 rounded-[4px] bg-success/15 border border-success/40 flex items-center justify-center">
              <Terminal size={16} className="text-success" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-primary">Acesso ao Terminal</h2>
              <p className="text-[11px] text-muted mt-0.5">
                Digite seu código de acesso para continuar.
              </p>
            </div>
          </div>

          <Input
            type="password"
            value={senha}
            onChange={e => {
              setSenha(e.target.value)
              if (erro) setErro('')
            }}
            onKeyDown={e => e.key === 'Enter' && verificar()}
            placeholder="••••••"
            invalid={!!erro}
            mono
            autoFocus
          />

          {erro && (
            <div className="mt-2 rounded-[2px] border border-critical/40 bg-critical/10 px-3 py-1.5 text-[11px] text-critical font-mono">
              ! {erro}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Button variant="secondary" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={verificar}
              disabled={verificando || !senha}
              className="flex-1"
            >
              {verificando ? <Spinner size={11} /> : null}
              {verificando ? 'Verificando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
