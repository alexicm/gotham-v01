// components/windows/BuscaWindow.tsx
'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { BuscaParams, BuscaResult } from '@/types/empresa'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface Props {
  onResultados: (result: BuscaResult, params: BuscaParams) => void
  onLoadingChange?: (loading: boolean) => void
}

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#fdf9f0',
  border: '1px solid #c8b888', borderRadius: 8, fontSize: 13,
  color: '#2c2416', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', minHeight: 40,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#7a6a4a',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
}
const sectionTitle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#a89868',
  textTransform: 'uppercase', margin: '14px 0 8px', borderBottom: '1px solid #e0d8c8',
  paddingBottom: 4,
}

// ─── Componente Chip (toggle) ─────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 20, fontSize: 11, fontFamily: 'inherit',
        border: `1px solid ${active ? '#d97706' : '#c8b888'}`,
        background: active ? '#fbbf24' : '#faf8f2',
        color: active ? '#2c2416' : '#7a6a4a',
        fontWeight: active ? 700 : 400, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ─── Componente Checkbox ──────────────────────────────────────────────────────
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: '#2c2416' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: `1.5px solid ${checked ? '#d97706' : '#c8b888'}`,
          background: checked ? '#fbbf24' : '#faf8f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked && <span style={{ fontSize: 9, color: '#2c2416', lineHeight: 1 }}>✓</span>}
      </div>
      {label}
    </label>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BuscaWindow({ onResultados, onLoadingChange }: Props) {
  // Aba ativa
  const [aba, setAba] = useState<'cnae' | 'empresa' | 'localiz' | 'periodo'>('cnae')

  // Aba 1 — CNAE & Termos
  const [cnae, setCnae] = useState('')
  const [cnpjs, setCnpjs] = useState('')
  const [termoInput, setTermoInput] = useState('')
  const [termos, setTermos] = useState<string[]>([])
  const [termoBuscaEm, setTermoBuscaEm] = useState<'R' | 'F' | 'A'>('A')
  const [incluirSecundarios, setIncluirSecundarios] = useState(false)
  const [somenteMatrizes, setSomenteMatrizes] = useState(false)

  // Aba 2 — Empresa
  const [filtroPortes, setFiltroPortes] = useState<string[]>([])
  const [filtroSituacoes, setFiltroSituacoes] = useState<string[]>(['ATIVA'])
  const [capitalMin, setCapitalMin] = useState('')
  const [capitalMax, setCapitalMax] = useState('')
  const [simples, setSimples] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')
  const [mei, setMei] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')

  // Aba 3 — Localização
  const [uf, setUf] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [porPagina, setPorPagina] = useState(50)

  // Aba 4 — Contato & Período
  const [telefoneObrigatorio, setTelefoneObrigatorio] = useState(false)
  const [emailObrigatorio, setEmailObrigatorio] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ─ Helpers ─
  function togglePorte(p: string) {
    setFiltroPortes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }
  function toggleSituacao(s: string) {
    setFiltroSituacoes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function adicionarTermo() {
    const t = termoInput.trim()
    if (t && !termos.includes(t)) setTermos(prev => [...prev, t])
    setTermoInput('')
  }

  // ─ Submit ─
  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    if (!cnae.trim()) { setError('Informe ao menos um CNAE.'); return }
    setError('')
    setLoading(true)
    onLoadingChange?.(true)

    const cnaes = cnae.trim().split(/[,\s]+/).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(Boolean)

    const payload: Record<string, unknown> = {
      cnaes,
      inicio: 0,
      quantidade: porPagina,
    }

    if (cnpjs.trim()) {
      payload.cnpjs = cnpjs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    }
    if (termos.length > 0) {
      payload.termos_busca = termos.map(t => ({ termo: t, tipo: termoBuscaEm }))
    }
    if (incluirSecundarios) payload.incluir_cnaes_secundarios = true
    if (somenteMatrizes) payload.somente_matrizes = true
    if (uf) payload.estados = [uf.toUpperCase()]
    if (capitalMin) payload.capital_social_minimo = Number(capitalMin)
    if (capitalMax) payload.capital_social_maximo = Number(capitalMax)
    if (simples === 'apenas') payload.simples_nacional = true
    if (simples === 'excluir') payload.simples_nacional = false
    if (mei === 'apenas') payload.mei = true
    if (mei === 'excluir') payload.mei = false
    if (telefoneObrigatorio) payload.telefone_obrigatorio = true
    if (emailObrigatorio) payload.email_obrigatorio = true
    if (dataInicio) payload.data_inicio = dataInicio
    if (dataFim) payload.data_fim = dataFim

    const params: BuscaParams = {
      cnae: cnae.trim(), cnpjs: cnpjs.trim() || undefined,
      termosBusca: termos.join(',') || undefined, termoBuscaEm,
      incluirCnaesSecundarios: incluirSecundarios || undefined,
      somenteMatrizes: somenteMatrizes || undefined,
      simplesNacional: simples, mei,
      capitalSocialMinimo: capitalMin ? Number(capitalMin) : undefined,
      capitalSocialMaximo: capitalMax ? Number(capitalMax) : undefined,
      uf: uf || undefined, municipio: municipio.trim() || undefined,
      porPagina, pagina: 1,
      telefoneObrigatorio: telefoneObrigatorio || undefined,
      emailObrigatorio: emailObrigatorio || undefined,
      dataInicio: dataInicio || undefined, dataFim: dataFim || undefined,
      filtroPortes: filtroPortes.length > 0 ? filtroPortes : undefined,
      filtroSituacoes: filtroSituacoes.length > 0 ? filtroSituacoes : undefined,
    }

    try {
      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao buscar empresas.'); return }
      onResultados(data, params)
    } catch {
      setError('Falha na conexao com a API.')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  // ─ Tabs ─
  const tabs: { id: typeof aba; label: string; badge?: number }[] = [
    { id: 'cnae', label: 'CNAE & Termos' },
    { id: 'empresa', label: 'Empresa', badge: [filtroPortes.length, filtroSituacoes.length].reduce((a, b) => a + b, 0) || undefined },
    { id: 'localiz', label: 'Localização' },
    { id: 'periodo', label: 'Contato & Período' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8' }}>
      <style>{`
        .busca-input:focus { border-color: #fbbf24 !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.18); }
        .busca-select { -webkit-appearance: none; appearance: none; }
        @keyframes busca-spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #ddd0b0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Search size={16} color="#d97706" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2416' }}>nova_busca.cnae</span>
        </div>
        <p style={{ fontSize: 11, color: '#7a6a4a', margin: 0 }}>Busque empresas por CNAE usando a base Lista CNAE</p>
      </div>

      {/* Tab bar */}
      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', background: '#ede8da', borderRadius: 7, padding: 3, gap: 2 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              style={{
                flex: 1, padding: '6px 4px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.05em', textAlign: 'center', border: 'none', borderRadius: 5,
                background: aba === t.id ? '#fbbf24' : 'transparent',
                color: aba === t.id ? '#2c2416' : '#7a6a4a',
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase',
                position: 'relative',
              }}
            >
              {t.label}
              {t.badge ? (
                <span style={{
                  position: 'absolute', top: 2, right: 4, background: '#d97706',
                  color: 'white', borderRadius: 3, padding: '0 4px', fontSize: 8, fontWeight: 700,
                }}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleBuscar}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      >
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ─ ABA: CNAE & Termos ─ */}
          {aba === 'cnae' && (
            <>
              <div>
                <label style={labelStyle}>Código CNAE *</label>
                <input
                  className="busca-input"
                  style={inputStyle}
                  type="text"
                  placeholder="Ex: 6201500, 4530703"
                  value={cnae}
                  onChange={e => setCnae(e.target.value)}
                  required
                  autoComplete="off"
                />
                <p style={{ fontSize: 10, color: '#a89868', marginTop: 3 }}>
                  Múltiplos CNAEs separados por vírgula
                </p>
              </div>
              <div>
                <label style={labelStyle}>CNPJs específicos <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
                <input
                  className="busca-input"
                  style={inputStyle}
                  type="text"
                  placeholder="Ex: 00.000.000/0001-91, 46729632000191"
                  value={cnpjs}
                  onChange={e => setCnpjs(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={labelStyle}>Palavras-chave na razão social / fantasia</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, background: '#fdf9f0', border: '1px solid #c8b888', borderRadius: 8, padding: '7px 10px', minHeight: 40, alignItems: 'center' }}>
                  {termos.map(t => (
                    <span key={t} style={{ background: '#ede8da', border: '1px solid #c8b888', borderRadius: 4, padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t}
                      <X size={10} style={{ cursor: 'pointer', color: '#a89868' }} onClick={() => setTermos(prev => prev.filter(x => x !== t))} />
                    </span>
                  ))}
                  <input
                    value={termoInput}
                    onChange={e => setTermoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); adicionarTermo() } }}
                    placeholder={termos.length === 0 ? 'Digite um termo e pressione Enter...' : '+ adicionar...'}
                    style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 11, outline: 'none', color: '#2c2416', minWidth: 120, flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#7a6a4a' }}>Buscar em:</span>
                  {[{ v: 'R' as const, l: 'Razão Social' }, { v: 'F' as const, l: 'Fantasia' }, { v: 'A' as const, l: 'Ambos' }].map(o => (
                    <Chip key={o.v} label={o.l} active={termoBuscaEm === o.v} onClick={() => setTermoBuscaEm(o.v)} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Checkbox label="Incluir CNAEs secundários" checked={incluirSecundarios} onChange={setIncluirSecundarios} />
                <Checkbox label="Somente matrizes (ignorar filiais)" checked={somenteMatrizes} onChange={setSomenteMatrizes} />
              </div>
            </>
          )}

          {/* ─ ABA: Empresa ─ */}
          {aba === 'empresa' && (
            <>
              <div>
                <label style={labelStyle}>Porte da empresa <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(filtro local)</span></label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ v: 'ME', l: 'Micro (ME)' }, { v: 'EPP', l: 'Peq. Porte (EPP)' }, { v: 'DEMAIS', l: 'Demais' }].map(o => (
                    <Chip key={o.v} label={o.l} active={filtroPortes.includes(o.v)} onClick={() => togglePorte(o.v)} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: '#a89868', marginTop: 4 }}>Nenhum selecionado = todos os portes</p>
              </div>
              <div>
                <label style={labelStyle}>Situação cadastral <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(filtro após enriquecimento)</span></label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['ATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA', 'NULA'].map(s => (
                    <Chip key={s} label={s} active={filtroSituacoes.includes(s)} onClick={() => toggleSituacao(s)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Capital social (R$)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="busca-input" style={inputStyle} type="number" min="0" placeholder="Mínimo" value={capitalMin} onChange={e => setCapitalMin(e.target.value)} />
                  <span style={{ fontSize: 12, color: '#a89868', flexShrink: 0 }}>—</span>
                  <input className="busca-input" style={inputStyle} type="number" min="0" placeholder="Máximo" value={capitalMax} onChange={e => setCapitalMax(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Simples Nacional</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'ignorar' as const, l: 'Ignorar' }, { v: 'apenas' as const, l: 'Apenas Simples' }, { v: 'excluir' as const, l: 'Excluir Simples' }].map(o => (
                    <Chip key={o.v} label={o.l} active={simples === o.v} onClick={() => setSimples(o.v)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>MEI</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'ignorar' as const, l: 'Ignorar' }, { v: 'apenas' as const, l: 'Apenas MEI' }, { v: 'excluir' as const, l: 'Excluir MEI' }].map(o => (
                    <Chip key={o.v} label={o.l} active={mei === o.v} onClick={() => setMei(o.v)} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─ ABA: Localização ─ */}
          {aba === 'localiz' && (
            <>
              <div>
                <label style={labelStyle}>Estado (UF)</label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="busca-select"
                    style={{ ...inputStyle, paddingRight: 36, cursor: 'pointer' }}
                    value={uf}
                    onChange={e => setUf(e.target.value)}
                  >
                    <option value="">Todos os estados</option>
                    {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z" fill="#a89868" /></svg>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Município <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(filtro local)</span></label>
                <input className="busca-input" style={inputStyle} type="text" placeholder="Ex: São Paulo, Campinas..." value={municipio} onChange={e => setMunicipio(e.target.value)} autoComplete="off" />
                <p style={{ fontSize: 10, color: '#a89868', marginTop: 3 }}>Filtro aplicado localmente nos resultados</p>
              </div>
              <div>
                <label style={labelStyle}>Registros por página</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[10, 25, 50, 100].map(n => (
                    <Chip key={n} label={String(n)} active={porPagina === n} onClick={() => setPorPagina(n)} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─ ABA: Contato & Período ─ */}
          {aba === 'periodo' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={sectionTitle}>Contato</p>
                <Checkbox label="Somente empresas com telefone" checked={telefoneObrigatorio} onChange={setTelefoneObrigatorio} />
                <Checkbox label="Somente empresas com e-mail" checked={emailObrigatorio} onChange={setEmailObrigatorio} />
              </div>
              <div>
                <p style={sectionTitle}>Data de Abertura</p>
                <label style={labelStyle}>Período</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="busca-input" style={inputStyle} type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                  <span style={{ fontSize: 12, color: '#a89868', flexShrink: 0 }}>—</span>
                  <input className="busca-input" style={inputStyle} type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <div style={{ borderTop: '1px solid #ddd0b0', padding: '14px 16px', flexShrink: 0 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 24px',
              background: loading ? '#e0d8c4' : '#fbbf24',
              color: loading ? '#a89868' : '#1a1208',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', minHeight: 48,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid #a89868', borderTopColor: '#7a6a4a', borderRadius: '50%', animation: 'busca-spin 0.7s linear infinite' }} />
                Buscando...
              </>
            ) : (
              <><Search size={15} /> Buscar empresas</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
