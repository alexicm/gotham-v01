'use client'

import { useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import type { BuscaParams, BuscaResult } from '@/types/empresa'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
]

const PORTES = [
  { value: '', label: 'Todos os portes' },
  { value: 'ME', label: 'Microempresa (ME)' },
  { value: 'EPP', label: 'Pequeno Porte (EPP)' },
  { value: 'DEMAIS', label: 'Demais' },
]

interface Props {
  onResultados: (result: BuscaResult, params: BuscaParams) => void
  onLoadingChange?: (loading: boolean) => void
}

export function BuscaWindow({ onResultados, onLoadingChange }: Props) {
  const [cnae, setCnae] = useState('')
  const [uf, setUf] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [porte, setPorte] = useState('')
  const [porPagina, setPorPagina] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    if (!cnae.trim()) {
      setError('Informe ao menos um CNAE para buscar.')
      return
    }
    setError('')
    setLoading(true)
    onLoadingChange?.(true)

    const params: BuscaParams = {
      cnae: cnae.trim(),
      uf: uf || undefined,
      municipio: municipio.trim() || undefined,
      porte: porte || undefined,
      pagina: 1,
      porPagina,
    }

    try {
      const qs = new URLSearchParams()
      qs.set('cnae', params.cnae!)
      if (params.uf) qs.set('uf', params.uf)
      if (params.municipio) qs.set('municipio', params.municipio)
      if (params.porte) qs.set('porte', params.porte)
      qs.set('pagina', '1')
      qs.set('porPagina', String(porPagina))

      const res = await fetch(`/api/busca-cnae?${qs.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao buscar empresas.')
        return
      }
      onResultados(data, params)
    } catch {
      setError('Falha na conexão com a API.')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: '#fdf9f0',
    border: '1px solid #c8b888',
    borderRadius: 6,
    fontSize: 13,
    color: '#2c2416',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#7a6a4a',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #ddd0b0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Search size={18} color="#d97706" />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#2c2416' }}>nova_busca.cnae</span>
        </div>
        <p style={{ fontSize: 12, color: '#7a6a4a', margin: 0 }}>
          Busque empresas por CNAE usando a base Lista CNAE
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleBuscar} style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* CNAE */}
        <div>
          <label style={labelStyle}>Codigo CNAE *</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Ex: 6201500, 4530703, 4711302"
            value={cnae}
            onChange={e => setCnae(e.target.value)}
            required
          />
          <p style={{ fontSize: 11, color: '#a89868', marginTop: 4 }}>
            Cole multiplos CNAEs separados por virgula
          </p>
        </div>

        {/* UF + Municipio */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>UF</label>
            <div style={{ position: 'relative' }}>
              <select
                style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
                value={uf}
                onChange={e => setUf(e.target.value)}
              >
                <option value="">Todos</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <ChevronDown size={14} color="#7a6a4a" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Municipio</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="Ex: Sao Paulo, Campinas..."
              value={municipio}
              onChange={e => setMunicipio(e.target.value)}
            />
          </div>
        </div>

        {/* Porte + Quantidade */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Porte da empresa</label>
            <div style={{ position: 'relative' }}>
              <select
                style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
                value={porte}
                onChange={e => setPorte(e.target.value)}
              >
                {PORTES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown size={14} color="#7a6a4a" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Registros por pagina</label>
            <div style={{ position: 'relative' }}>
              <select
                style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
                value={porPagina}
                onChange={e => setPorPagina(Number(e.target.value))}
              >
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} empresas</option>)}
              </select>
              <ChevronDown size={14} color="#7a6a4a" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* CTA */}
        <div style={{ borderTop: '1px solid #ddd0b0', paddingTop: 16 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: loading ? '#e0d8c4' : '#fbbf24',
              color: loading ? '#a89868' : '#1a1208',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #a89868', borderTopColor: '#7a6a4a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Buscando...
              </>
            ) : (
              <>
                <Search size={15} />
                Buscar empresas
              </>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </form>
    </div>
  )
}
