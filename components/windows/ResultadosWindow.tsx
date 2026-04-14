'use client'

import { useState, useMemo } from 'react'
import { FileText, Download, ChevronUp, ChevronDown, Search } from 'lucide-react'
import type { Empresa, BuscaResult } from '@/types/empresa'
import { formatCNPJ, formatCapital, situacaoColor, exportCSV, exportJSON } from '@/lib/formatters'

interface Props {
  resultado: BuscaResult
  onAbrirFicha: (empresa: Empresa) => void
  onPaginar?: (pagina: number) => void
  loadingPagina?: boolean
}

type SortKey = 'razaoSocial' | 'municipio' | 'uf' | 'porte' | 'capitalSocial' | 'situacao'

// ─── Card view (mobile) ───────────────────────────────────────────────────────

function EmpresaCard({
  empresa,
  onAbrirFicha,
}: {
  empresa: Empresa
  onAbrirFicha: (e: Empresa) => void
}) {
  const sit = empresa.situacao
  return (
    <div
      style={{
        background: '#faf8f2',
        border: '1px solid #e8e0cc',
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#2c2416',
              lineHeight: 1.3,
              marginBottom: 2,
              wordBreak: 'break-word',
            }}
          >
            {empresa.nomeFantasia || empresa.razaoSocial}
          </div>
          {empresa.nomeFantasia && (
            <div style={{ fontSize: 11, color: '#7a6a4a', marginBottom: 4 }}>
              {empresa.razaoSocial}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#a89868', fontFamily: 'monospace' }}>
            {formatCNPJ(empresa.cnpj)}
          </div>
        </div>
        <span
          style={{
            flexShrink: 0,
            display: 'inline-block',
            padding: '3px 8px',
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 700,
            background: situacaoColor(sit) + '22',
            color: situacaoColor(sit),
            border: `1px solid ${situacaoColor(sit)}44`,
            whiteSpace: 'nowrap',
          }}
        >
          {sit}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 16px',
          fontSize: 12,
          color: '#7a6a4a',
        }}
      >
        <span>
          <strong style={{ color: '#2c2416' }}>{empresa.uf}</strong> — {empresa.municipio}
        </span>
        {empresa.porte && (
          <span>
            Porte: <strong style={{ color: '#2c2416' }}>{empresa.porte}</strong>
          </span>
        )}
        {empresa.capitalSocial != null && empresa.capitalSocial > 0 && (
          <span>
            Capital: <strong style={{ color: '#2c2416', fontFamily: 'monospace' }}>{formatCapital(empresa.capitalSocial)}</strong>
          </span>
        )}
      </div>

      <button
        onClick={() => onAbrirFicha(empresa)}
        style={{
          alignSelf: 'flex-end',
          padding: '8px 18px',
          background: '#fbbf24',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          color: '#1a1208',
          fontFamily: 'inherit',
          minHeight: 40,
          touchAction: 'manipulation',
        }}
      >
        Ver Ficha
      </button>
    </div>
  )
}

// ─── Table view (desktop) ─────────────────────────────────────────────────────

function SortIcon({ sortKey, k, sortDir }: { sortKey: SortKey; k: SortKey; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== k) return <ChevronUp size={12} color="#c8b888" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} color="#d97706" />
    : <ChevronDown size={12} color="#d97706" />
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  color: '#7a6a4a',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  userSelect: 'none',
  background: '#ede8da',
  borderBottom: '2px solid #c8b888',
}

const tdStyle: React.CSSProperties = {
  padding: '9px 12px',
  fontSize: 12,
  color: '#2c2416',
  borderBottom: '1px solid #e8e0cc',
  verticalAlign: 'middle',
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    background: bg,
    border: '1px solid #c8b888',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    color,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    minHeight: 34,
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ResultadosWindow({ resultado, onAbrirFicha, onPaginar, loadingPagina }: Props) {
  const { empresas, total, pagina, ultimaPagina } = resultado
  const [filtro, setFiltro] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('razaoSocial')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = filtro.toLowerCase()
    return empresas.filter(e =>
      !q ||
      e.razaoSocial.toLowerCase().includes(q) ||
      e.nomeFantasia?.toLowerCase().includes(q) ||
      e.cnpj.includes(q) ||
      e.municipio?.toLowerCase().includes(q)
    )
  }, [empresas, filtro])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'pt-BR')
        : String(bv).localeCompare(String(av), 'pt-BR')
    })
  }, [filtered, sortKey, sortDir])

  function handleExportCSV() {
    const rows = sorted.map(e => ({
      CNPJ: formatCNPJ(e.cnpj),
      'Razao Social': e.razaoSocial,
      'Nome Fantasia': e.nomeFantasia,
      CNAE: e.cnae,
      'Desc. CNAE': e.descricaoCnae,
      Municipio: e.municipio,
      UF: e.uf,
      Situacao: e.situacao,
      Porte: e.porte,
      'Capital Social': e.capitalSocial,
      Email: e.email ?? '',
      Telefone: e.telefone ?? '',
    }))
    exportCSV(rows, `empresas_cnae_${Date.now()}.csv`)
  }

  function handleExportJSON() {
    exportJSON(sorted, `empresas_cnae_${Date.now()}.json`)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8' }}>
      <style>{`
        .res-table-view { display: block; }
        .res-cards-view { display: none; }
        @media (max-width: 767px) {
          .res-table-view { display: none; }
          .res-cards-view { display: flex; }
        }
        .res-row:hover td { background: #fef3c7 !important; }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #ddd0b0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          flexWrap: 'wrap',
          rowGap: 8,
        }}
      >
        <FileText size={16} color="#d97706" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 100 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2416' }}>resultados.cnae</span>
          <span style={{ fontSize: 11, color: '#7a6a4a', marginLeft: 8 }}>
            {total.toLocaleString('pt-BR')} empresas
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={handleExportCSV} style={btnStyle('#ede8da', '#2c2416')} title="Exportar CSV">
            <Download size={13} /> CSV
          </button>
          <button onClick={handleExportJSON} style={btnStyle('#ede8da', '#2c2416')} title="Exportar JSON">
            <Download size={13} /> JSON
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #ddd0b0', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} color="#a89868" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Filtrar por nome, CNPJ, municipio..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 32px',
              background: '#fdf9f0',
              border: '1px solid #c8b888',
              borderRadius: 8,
              fontSize: 13,
              color: '#2c2416',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              minHeight: 40,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loadingPagina ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#7a6a4a', fontSize: 13 }}>
            Carregando...
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#7a6a4a', fontSize: 13 }}>
            Nenhuma empresa encontrada com este filtro.
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="res-table-view" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr>
                    {(
                      [
                        { k: 'razaoSocial', label: 'Razao Social' },
                        { k: 'municipio', label: 'Municipio' },
                        { k: 'uf', label: 'UF' },
                        { k: 'porte', label: 'Porte' },
                        { k: 'capitalSocial', label: 'Capital' },
                        { k: 'situacao', label: 'Situacao' },
                      ] as { k: SortKey; label: string }[]
                    ).map(({ k, label }) => (
                      <th key={k} style={thStyle} onClick={() => handleSort(k)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {label}
                          <SortIcon sortKey={sortKey} k={k} sortDir={sortDir} />
                        </div>
                      </th>
                    ))}
                    <th style={thStyle}>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((empresa, i) => (
                    <tr
                      key={empresa.cnpj}
                      className="res-row"
                      style={{ background: i % 2 === 0 ? '#faf8f2' : '#f5f1e8' }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#2c2416', marginBottom: 2 }}>
                          {empresa.nomeFantasia || empresa.razaoSocial}
                        </div>
                        <div style={{ fontSize: 10, color: '#a89868', fontFamily: 'monospace' }}>
                          {formatCNPJ(empresa.cnpj)}
                        </div>
                      </td>
                      <td style={tdStyle}>{empresa.municipio}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{empresa.uf}</td>
                      <td style={tdStyle}>{empresa.porte}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>
                        {formatCapital(empresa.capitalSocial)}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 700,
                            background: situacaoColor(empresa.situacao) + '22',
                            color: situacaoColor(empresa.situacao),
                            border: `1px solid ${situacaoColor(empresa.situacao)}44`,
                          }}
                        >
                          {empresa.situacao}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => onAbrirFicha(empresa)}
                          style={{
                            padding: '5px 12px',
                            background: '#fbbf24',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#1a1208',
                            fontFamily: 'inherit',
                          }}
                        >
                          Ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div
              className="res-cards-view"
              style={{
                flexDirection: 'column',
                gap: 12,
                padding: '12px 16px',
                overflowY: 'auto',
              }}
            >
              {sorted.map(empresa => (
                <EmpresaCard key={empresa.cnpj} empresa={empresa} onAbrirFicha={onAbrirFicha} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Paginacao */}
      {ultimaPagina > 1 && (
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #ddd0b0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: '#7a6a4a' }}>
            Pag. {pagina} / {ultimaPagina}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={pagina <= 1}
              onClick={() => onPaginar?.(pagina - 1)}
              style={btnStyle(pagina <= 1 ? '#e8e0cc' : '#ede8da', pagina <= 1 ? '#a89868' : '#2c2416')}
            >
              Anterior
            </button>
            <button
              disabled={pagina >= ultimaPagina}
              onClick={() => onPaginar?.(pagina + 1)}
              style={btnStyle(pagina >= ultimaPagina ? '#e8e0cc' : '#fbbf24', pagina >= ultimaPagina ? '#a89868' : '#1a1208')}
            >
              Proxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
