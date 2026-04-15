// components/LoginScreen.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { BarChart2, Eye, EyeOff, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

  useEffect(() => { cpfRef.current?.focus() }, [])

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
    if (erro) setErro('')
    if (formatted.replace(/\D/g, '').length === 11) {
      setTimeout(() => codigoRef.current?.focus(), 50)
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
      setErro('CPF ou código incorretos. Tente novamente.')
      triggerShake()
      return
    }

    onLogin()
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.bgDots} />
      <div style={{ ...styles.card, ...(shake ? styles.shake : {}) }}>
        <div style={styles.titleBar}>
          <div style={styles.trafficLights}>
            <div style={{ ...styles.dot, background: '#f87171' }} />
            <div style={{ ...styles.dot, background: '#fbbf24' }} />
            <div style={{ ...styles.dot, background: '#4ade80' }} />
          </div>
          <span style={styles.titleBarText}>login.cnae</span>
        </div>
        <div style={styles.body}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <BarChart2 size={22} color="#d97706" strokeWidth={2} />
            </div>
            <div>
              <div style={styles.logoTitle}>Gotham Search</div>
              <div style={styles.logoSub}>Sistema de Inteligencia Empresarial</div>
            </div>
          </div>
          <div style={styles.divider} />
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>CPF</label>
              <input type="text" inputMode="numeric" placeholder="000.000.000-00"
                value={cpf} onChange={handleCpfChange} style={styles.input}
                ref={cpfRef} autoComplete="username" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>CÓDIGO DE ACESSO MASTER</label>
              <div style={styles.inputWrap}>
                <input ref={codigoRef} type={showCodigo ? 'text' : 'password'}
                  inputMode="numeric" placeholder="••••••" value={codigo}
                  onChange={handleCodigoChange}
                  style={{ ...styles.input, paddingRight: 40 }}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowCodigo(v => !v)}
                  style={styles.eyeBtn} tabIndex={-1}
                  aria-label={showCodigo ? 'Ocultar' : 'Mostrar'}>
                  {showCodigo ? <EyeOff size={14} color="#a89868" /> : <Eye size={14} color="#a89868" />}
                </button>
              </div>
            </div>
            {erro && <div style={styles.erro} role="alert">{erro}</div>}
            <button type="submit" disabled={loading}
              style={{ ...styles.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? <span style={styles.spinner} /> : <LogIn size={15} color="#2c2416" />}
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
      <p style={styles.footer}>Gotham Search v1.0 — Dados: Lista CNAE + BrasilAPI</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#d4c4a8', zIndex: 9999, padding: 16 },
  bgDots: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#c2b090 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' },
  card: { position: 'relative', width: '100%', maxWidth: 380, background: '#f5f1e8', border: '1.5px solid #c8b888', borderRadius: 10, boxShadow: '0 8px 32px rgba(44,36,22,0.18)', overflow: 'hidden', transition: 'transform 0.1s' },
  shake: { animation: 'shake 0.45s ease' },
  titleBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#ede8da', borderBottom: '1px solid #c8b888' },
  trafficLights: { display: 'flex', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)' },
  titleBarText: { fontSize: 12, color: '#7a6a4a', fontFamily: 'inherit', flex: 1, textAlign: 'center' },
  body: { padding: '24px 28px 28px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoIcon: { width: 44, height: 44, borderRadius: 10, background: '#fef3c7', border: '1.5px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoTitle: { fontSize: 16, fontWeight: 700, color: '#2c2416', letterSpacing: '0.05em', fontFamily: 'inherit' },
  logoSub: { fontSize: 10, color: '#7a6a4a', fontFamily: 'inherit', marginTop: 2 },
  divider: { height: 1, background: '#ddd0b0', marginBottom: 22 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 10, fontWeight: 600, color: '#7a6a4a', letterSpacing: '0.1em', fontFamily: 'inherit' },
  inputWrap: { position: 'relative' },
  input: { width: '100%', padding: '10px 12px', background: '#faf8f2', border: '1.5px solid #c8b888', borderRadius: 6, fontSize: 14, color: '#2c2416', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  erro: { fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontFamily: 'inherit' },
  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: '#fbbf24', border: '1.5px solid #d97706', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#2c2416', fontFamily: 'inherit', marginTop: 4, width: '100%' },
  spinner: { display: 'inline-block', width: 14, height: 14, border: '2px solid #2c241640', borderTopColor: '#2c2416', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  footer: { position: 'relative', marginTop: 20, fontSize: 10, color: '#a89868', fontFamily: 'inherit', letterSpacing: '0.05em' },
}
