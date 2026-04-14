'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, FileText, Building2, Terminal, ChevronLeft, LogOut } from 'lucide-react'
import { BuscaWindow } from './windows/BuscaWindow'
import { ResultadosWindow } from './windows/ResultadosWindow'
import { FichaWindow } from './windows/FichaWindow'
import { CnaeTerminalWindow } from './windows/CnaeTerminalWindow'
import type { Empresa, BuscaResult, BuscaParams } from '@/types/empresa'

type Tab = 'busca' | 'resultados' | 'ficha' | 'terminal'

interface FichaTarget {
  cnpj: string
  base?: Empresa
}

// ─── Header ───────────────────────────────────────────────────────────────────

function MobileHeader({
  title,
  subtitle,
  onBack,
  onLogout,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  onLogout?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        height: 52,
        background: '#f5f1e8',
        borderBottom: '1.5px solid #c8b888',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Voltar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            background: '#ede8da',
            border: '1px solid #c8b888',
            borderRadius: 8,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} color="#2c2416" />
        </button>
      )}
      {/* CNAE OS brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <div
          style={{
            width: 22,
            height: 22,
            background: '#fbbf24',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={11} color="#1a1208" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#2c2416' }}>CNAE OS</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#2c2416',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 10, color: '#7a6a4a', marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      {onLogout && (
        <button
          onClick={onLogout}
          aria-label="Sair do sistema"
          title="Sair"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            background: '#ede8da',
            border: '1px solid #c8b888',
            borderRadius: 8,
            cursor: 'pointer',
            flexShrink: 0,
            color: '#7a6a4a',
          }}
        >
          <LogOut size={16} color="#7a6a4a" />
        </button>
      )}
    </div>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const NAV_ITEMS: { tab: Tab; label: string; Icon: React.FC<{ size: number; color: string }> }[] = [
  { tab: 'busca', label: 'Busca', Icon: Search },
  { tab: 'resultados', label: 'Resultados', Icon: FileText },
  { tab: 'ficha', label: 'Ficha', Icon: Building2 },
  { tab: 'terminal', label: 'Terminal', Icon: Terminal },
]

function BottomNav({
  active,
  onChange,
  hasResultados,
  hasFicha,
}: {
  active: Tab
  onChange: (t: Tab) => void
  hasResultados: boolean
  hasFicha: boolean
}) {
  return (
    <nav
      aria-label="Navegacao principal"
      style={{
        display: 'flex',
        background: '#f5f1e8',
        borderTop: '1.5px solid #c8b888',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map(({ tab, label, Icon }) => {
        const isActive = active === tab
        const isDisabled = (tab === 'resultados' && !hasResultados) || (tab === 'ficha' && !hasFicha)
        return (
          <button
            key={tab}
            onClick={() => !isDisabled && onChange(tab)}
            disabled={isDisabled}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '10px 4px',
              background: 'transparent',
              border: 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.35 : 1,
              borderTop: isActive ? '2px solid #fbbf24' : '2px solid transparent',
              transition: 'border-color 0.15s',
            }}
          >
            <Icon size={20} color={isActive ? '#d97706' : '#7a6a4a'} />
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#d97706' : '#7a6a4a',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Mobile Layout ─────────────────────────────────────────────────────────────

export function MobileLayout({ onLogout }: { onLogout?: () => void }) {
  const [tab, setTab] = useState<Tab>('busca')
  const [resultado, setResultado] = useState<BuscaResult | null>(null)
  const [params, setParams] = useState<BuscaParams | null>(null)
  const [fichaTarget, setFichaTarget] = useState<FichaTarget | null>(null)
  const [loadingPagina, setLoadingPagina] = useState(false)

  const paramsRef = useRef<BuscaParams | null>(null)
  const resultadoRef = useRef<BuscaResult | null>(null)

  const handleResultados = useCallback((result: BuscaResult, p: BuscaParams) => {
    setResultado(result)
    setParams(p)
    paramsRef.current = p
    resultadoRef.current = result
    setTab('resultados')
  }, [])

  const handleAbrirFicha = useCallback((empresa: Empresa) => {
    setFichaTarget({ cnpj: empresa.cnpj, base: empresa })
    setTab('ficha')
  }, [])

  const handlePaginar = useCallback(async (pagina: number) => {
    const p = paramsRef.current
    if (!p) return
    setLoadingPagina(true)

    const cnaes = (p.cnae ?? '').split(/[,\s]+/).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(Boolean)
    const porPagina = p.porPagina ?? 50
    const payload: Record<string, unknown> = {
      cnaes,
      inicio: (pagina - 1) * porPagina,
      quantidade: porPagina,
    }
    if (p.uf) payload.estados = [p.uf.toUpperCase()]

    try {
      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: BuscaResult = await res.json()
      setResultado(data)
      resultadoRef.current = data
    } finally {
      setLoadingPagina(false)
    }
  }, [])

  const handleTerminalResultados = useCallback((result: BuscaResult) => {
    setResultado(result)
    resultadoRef.current = result
    setTab('resultados')
  }, [])

  const handleTerminalFicha = useCallback((cnpj: string) => {
    setFichaTarget({ cnpj })
    setTab('ficha')
  }, [])

  const headerMap: Record<Tab, { title: string; subtitle?: string }> = {
    busca: { title: 'nova_busca.cnae', subtitle: 'Busque por CNAE, UF, municipio' },
    resultados: {
      title: 'resultados.cnae',
      subtitle: resultado ? `${resultado.total.toLocaleString('pt-BR')} empresas` : 'Sem resultados',
    },
    ficha: {
      title: fichaTarget ? `ficha_${fichaTarget.cnpj.replace(/\D/g, '')}.cnpj` : 'ficha.cnpj',
      subtitle: 'Dados completos BrasilAPI',
    },
    terminal: { title: 'terminal.cnae', subtitle: 'Shell CNAE OS' },
  }

  const h = headerMap[tab]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: '#f5f1e8',
        fontFamily: 'var(--font-mono), monospace',
        overscrollBehavior: 'none',
      }}
    >
      <MobileHeader
        title={h.title}
        subtitle={h.subtitle}
        onBack={tab === 'ficha' ? () => setTab('resultados') : undefined}
        onLogout={onLogout}
      />

      {/* Views */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Busca */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: tab === 'busca' ? 'flex' : 'none',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <BuscaWindow onResultados={handleResultados} />
        </div>

        {/* Resultados */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: tab === 'resultados' ? 'flex' : 'none',
            flexDirection: 'column',
          }}
        >
          {resultado ? (
            <ResultadosWindow
              resultado={resultado}
              onAbrirFicha={handleAbrirFicha}
              onPaginar={handlePaginar}
              loadingPagina={loadingPagina}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: '#7a6a4a',
                padding: 32,
                textAlign: 'center',
              }}
            >
              <FileText size={40} color="#c8b888" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma busca realizada</span>
              <span style={{ fontSize: 12 }}>Faca uma busca na aba Busca primeiro.</span>
              <button
                onClick={() => setTab('busca')}
                style={{
                  marginTop: 8,
                  padding: '10px 20px',
                  background: '#fbbf24',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#1a1208',
                  fontFamily: 'inherit',
                }}
              >
                Ir para Busca
              </button>
            </div>
          )}
        </div>

        {/* Ficha */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: tab === 'ficha' ? 'flex' : 'none',
            flexDirection: 'column',
          }}
        >
          {fichaTarget ? (
            <FichaWindow cnpj={fichaTarget.cnpj} empresaBase={fichaTarget.base} />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: '#7a6a4a',
                padding: 32,
                textAlign: 'center',
              }}
            >
              <Building2 size={40} color="#c8b888" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma empresa selecionada</span>
              <span style={{ fontSize: 12 }}>Selecione uma empresa nos resultados.</span>
            </div>
          )}
        </div>

        {/* Terminal */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: tab === 'terminal' ? 'flex' : 'none',
            flexDirection: 'column',
          }}
        >
          <CnaeTerminalWindow
            onAbrirBusca={() => setTab('busca')}
            onResultados={handleTerminalResultados}
            onAbrirFicha={handleTerminalFicha}
          />
        </div>
      </div>

      <BottomNav
        active={tab}
        onChange={setTab}
        hasResultados={resultado !== null}
        hasFicha={fichaTarget !== null}
      />
    </div>
  )
}
