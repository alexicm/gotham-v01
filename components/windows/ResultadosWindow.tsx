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

  const SortIcon = ({ k }: { k: SortKey }) => {
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #ddd0b0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <FileText size={16} color="#d97706" />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2416' }}>
            resultados.cnae
          </span>
          <span style={{ fontSize: 11, color: '#7a6a4a', marginLeft: 10 }}>
            {total.toLocaleString('pt-BR')} empresas encontradas
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleExportCSV} style={btnStyle('#ede8da', '#2c2416')} title="Exportar CSV">
            <Download size={13} /> CSV
          </button>
          <button onClick={handleExportJSON} style={btnStyle('#ede8da', '#2c2416')} title="Exportar JSON">
            <Download size={13} /> JSON
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #ddd0b0', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} color="#a89868" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Filtrar por nome, CNPJ, municipio..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              background: '#fdf9f0',
              border: '1px solid #c8b888',
              borderRadius: 6,
              fontSize: 12,
              color: '#2c2416',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingPagina ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#7a6a4a', fontSize: 13 }}>
            Carregando...
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#7a6a4a', fontSize: 13 }}>
            Nenhuma empresa encontrada com este filtro.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th style={thStyle} onClick={() => handleSort('razaoSocial')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Razao Social <SortIcon k="razaoSocial" /></div>
                </th>
                <th style={thStyle} onClick={() => handleSort('municipio')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Municipio <SortIcon k="municipio" /></div>
                </th>
                <th style={thStyle} onClick={() => handleSort('uf')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>UF <SortIcon k="uf" /></div>
                </th>
                <th style={thStyle} onClick={() => handleSort('porte')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Porte <SortIcon k="porte" /></div>
                </th>
                <th style={thStyle} onClick={() => handleSort('capitalSocial')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Capital <SortIcon k="capitalSocial" /></div>
                </th>
                <th style={thStyle} onClick={() => handleSort('situacao')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Situacao <SortIcon k="situacao" /></div>
                </th>
                <th style={thStyle}>Acao</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((empresa, i) => (
                <tr
                  key={empresa.cnpj}
                  style={{ background: i % 2 === 0 ? '#faf8f2' : '#f5f1e8' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef3c7')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#faf8f2' : '#f5f1e8')}
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
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                      background: situacaoColor(empresa.situacao) + '22',
                      color: situacaoColor(empresa.situacao),
                      border: `1px solid ${situacaoColor(empresa.situacao)}44`,
                    }}>
                      {empresa.situacao}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => onAbrirFicha(empresa)}
                      style={{
                        padding: '4px 10px',
                        background: '#fbbf24',
                        border: 'none',
                        borderRadius: 5,
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
        )}
      </div>

      {/* Paginacao */}
      {ultimaPagina > 1 && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid #ddd0b0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#7a6a4a' }}>
            Pagina {pagina} de {ultimaPagina}
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

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    background: bg,
    border: '1px solid #c8b888',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    color,
    fontFamily: 'inherit',
  }
}
