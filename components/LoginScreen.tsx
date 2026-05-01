'use client'

import { useState, useRef, useEffect } from 'react'
import { BarChart2, Eye, EyeOff, LogIn, Activity, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

interface Props {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: Props) {
  const [cpf, setCpf] = useState('')
  const [codigo, setCodigo] = useState('')
  const [showCodigo, setShowCodigo] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const cpfRef = useRef<HTMLInputElement>(null)
  const codigoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    cpfRef.current?.focus()
  }, [])

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 450)
  }

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
    if (erro) setErro('')
    if (formatted.replace(/\D/g, '').length === 11) {
      setTimeout(() => codigoRef.current?.focus(), 30)
    }
  }

  function handleCodigoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setCodigo(val)
    if (erro) setErro('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cpfRaw = cpf.replace(/\D/g, '')

    if (cpfRaw.length !== 11) {
      setErro('CPF inválido. Digite os 11 dígitos.')
      triggerShake()
      return
    }
    if (!codigo.trim()) {
      setErro('Informe o código de acesso.')
      triggerShake()
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: `${cpfRaw}@gotham.app`,
      password: codigo.trim(),
    })

    setLoading(false)

    if (error) {
      setErro('CPF ou código incorretos.')
      triggerShake()
      return
    }

    onLogin()
  }

  return (
    <div className="fixed inset-0 bg-background bg-grid-tech overflow-hidden flex flex-col items-center justify-center p-4 font-sans">
      <style>{`
        @keyframes gtm-shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        .gtm-shake { animation: gtm-shake 0.45s ease; }
      `}</style>

      <div className="pointer-events-none absolute inset-4 border border-border/40 hidden md:block" />
      <div className="pointer-events-none absolute top-3 left-3 text-[10px] font-mono uppercase tracking-[0.15em] text-muted/60">
        GOTHAM // SECURE TERMINAL
      </div>
      <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-success/70">
        <Activity size={10} />
        SYS:READY
      </div>

      <div
        className={cn(
          'relative w-full max-w-[400px] rounded-[4px] border border-border bg-surface',
          'shadow-[0_0_0_1px_rgba(48,54,61,0.4),0_24px_60px_rgba(0,0,0,0.55)]',
          shake && 'gtm-shake',
        )}
      >
        <div className="h-9 border-b border-border bg-surface-2 flex items-center justify-between px-3 rounded-t-[4px]">
          <div className="flex items-center gap-2">
            <Lock size={11} className="text-info" />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
              SYS:AUTH
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted/70">
            login.cnae
          </span>
        </div>

        <div className="p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-11 rounded-[4px] bg-info/15 border border-info/40 flex items-center justify-center flex-shrink-0">
              <BarChart2 size={22} className="text-info" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[18px] font-bold text-primary tracking-[0.02em] leading-tight">
                GOTHAM
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-mono">
                Sist. Inteligência Empresarial
              </div>
            </div>
          </div>

          <div className="h-px bg-border mb-5" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.12em] text-muted font-semibold">
                CPF
              </label>
              <input
                ref={cpfRef}
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                autoComplete="username"
                className="block w-full rounded-[4px] bg-background border border-border focus:border-info focus:ring-1 focus:ring-info/40 outline-none px-3 h-10 text-[14px] text-primary placeholder:text-muted/60 font-mono tabular tracking-wider"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.12em] text-muted font-semibold">
                Código de acesso master
              </label>
              <div className="relative">
                <input
                  ref={codigoRef}
                  type={showCodigo ? 'text' : 'password'}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={codigo}
                  onChange={handleCodigoChange}
                  autoComplete="current-password"
                  className="block w-full rounded-[4px] bg-background border border-border focus:border-info focus:ring-1 focus:ring-info/40 outline-none pl-3 pr-10 h-10 text-[14px] text-primary placeholder:text-muted/60 font-mono tracking-[0.3em]"
                />
                <button
                  type="button"
                  onClick={() => setShowCodigo(v => !v)}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors p-1"
                  aria-label={showCodigo ? 'Ocultar' : 'Mostrar'}
                >
                  {showCodigo ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {erro && (
              <div
                role="alert"
                className="rounded-[4px] border border-critical/40 bg-critical/10 px-3 py-2 text-[12px] text-critical font-mono"
              >
                ! {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex items-center justify-center gap-2 h-10 rounded-[4px] bg-info text-background font-bold tracking-[0.05em] text-[13px] hover:bg-info/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="size-3.5 rounded-full border-2 border-background/40 border-t-background animate-gtm-spin" />
                  AUTENTICANDO...
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  ACESSAR SISTEMA
                </>
              )}
            </button>
          </form>
        </div>

        <footer className="px-7 py-3 border-t border-border flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted/70">
            v1.0
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted/70">
            data: cnae · brasilapi
          </span>
        </footer>
      </div>

      <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted/50">
        GOTHAM SEARCH — RESTRICTED ACCESS
      </p>
    </div>
  )
}
