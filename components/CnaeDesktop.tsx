'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEnrichment } from '@/hooks/useEnrichment'
import {
  Search, Terminal, FileText, Building2, Clock, BarChart2,
  X, Minus, Maximize2, GripVertical, LogOut, ShieldCheck
} from 'lucide-react'
import { BuscaWindow } from './windows/BuscaWindow'
import { ResultadosWindow } from './windows/ResultadosWindow'
import { FichaWindow } from './windows/FichaWindow'
import { CnaeTerminalWindow } from './windows/CnaeTerminalWindow'
import { AdminWindow } from './windows/AdminWindow'
import { CnpjWindow } from './windows/CnpjWindow'
import { MobileLayout } from './MobileLayout'
import { usePermissoes } from '@/hooks/usePermissoes'
import type { Empresa, BuscaResult, BuscaParams } from '@/types/empresa'

// ─── Hook: detect mobile ──────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

// ─── Window types ──────────────────────────────────────────────────────────────

interface OsWindow {
  id: string
  title: string
  icon: React.ReactNode
  content: React.ReactNode
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  minimized: boolean
}

// ─── Desktop Icon ──────────────────────────────────────────────────────────────

function DesktopIcon({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 8px',
        background: hover ? 'rgba(251,191,36,0.18)' : 'transparent',
        border: hover ? '1px solid rgba(251,191,36,0.4)' : '1px solid transparent',
        borderRadius: 10,
        cursor: 'pointer',
        width: 80,
        transition: 'all 0.12s',
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        background: hover ? '#fbbf24' : '#ede8da',
        borderRadius: 12,
        border: '1.5px solid #c8b888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
        boxShadow: hover ? '0 4px 12px rgba(251,191,36,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 10,
        color: '#2c2416',
        fontWeight: 600,
        textAlign: 'center',
        lineHeight: 1.3,
        maxWidth: 74,
        wordBreak: 'break-word',
      }}>
        {label}
      </span>
    </button>
  )
}

// ─── OS Window ────────────────────────────────────────────────────────────────

const MENU_BAR_H = 38
const MIN_W = 380
const MIN_H = 280
const EDGE = 8   // px — border drag/resize hit area
const CORNER = 18 // px — corner resize hit area

type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

function OsWindowFrame({
  win,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  onResize,
  children,
}: {
  win: OsWindow
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onFocus: () => void
  onMove: (x: number, y: number) => void
  onResize: (w: number, h: number, x?: number, y?: number) => void
  children: React.ReactNode
}) {
  const dragging = useRef(false)
  const resizeDir = useRef<ResizeDir | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 })

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragging.current) {
        const newX = e.clientX - dragOffset.current.x
        const newY = Math.max(MENU_BAR_H, e.clientY - dragOffset.current.y)
        onMove(newX, newY)
        return
      }
      const dir = resizeDir.current
      if (!dir) return
      const { mx, my, x: ox, y: oy, w: ow, h: oh } = resizeStart.current
      const dx = e.clientX - mx
      const dy = e.clientY - my

      let newW = ow, newH = oh, newX = ox, newY = oy

      // horizontal
      if (dir.includes('e')) newW = Math.max(MIN_W, ow + dx)
      if (dir.includes('w')) { newW = Math.max(MIN_W, ow - dx); newX = ox + ow - newW }

      // vertical
      if (dir.includes('s')) newH = Math.max(MIN_H, oh + dy)
      if (dir === 'n' || dir === 'nw' || dir === 'ne') {
        newH = Math.max(MIN_H, oh - dy)
        newY = oy + oh - newH
        // Clamp so top border never goes above menu bar
        if (newY < MENU_BAR_H) { newY = MENU_BAR_H; newH = oh + oy - MENU_BAR_H }
      }

      const posChanged = newX !== ox || newY !== oy
      onResize(newW, newH, posChanged ? newX : undefined, posChanged ? newY : undefined)
    }
    function onMouseUp() {
      dragging.current = false
      resizeDir.current = null
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMove, onResize])

  function startDrag(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    e.stopPropagation()
    dragging.current = true
    dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y }
    onFocus()
  }

  function startResize(e: React.MouseEvent, dir: ResizeDir) {
    e.stopPropagation()
    e.preventDefault()
    resizeDir.current = dir
    resizeStart.current = { mx: e.clientX, my: e.clientY, x: win.x, y: win.y, w: win.width, h: win.height }
    onFocus()
  }

  // ── edge/corner hit-area helpers ──────────────────────────────────────────
  const edgeBase: React.CSSProperties = { position: 'absolute', zIndex: 10, userSelect: 'none' }

  // Corners (priority over edges — rendered last so they sit on top)
  const corners: { dir: ResizeDir; style: React.CSSProperties }[] = [
    { dir: 'nw', style: { top: 0, left: 0, width: CORNER, height: CORNER, cursor: 'nw-resize' } },
    { dir: 'ne', style: { top: 0, right: 0, width: CORNER, height: CORNER, cursor: 'ne-resize' } },
    { dir: 'sw', style: { bottom: 0, left: 0, width: CORNER, height: CORNER, cursor: 'sw-resize' } },
    { dir: 'se', style: { bottom: 0, right: 0, width: CORNER, height: CORNER, cursor: 'se-resize' } },
  ]

  // Edges (between corners)
  const edges: { dir: ResizeDir; style: React.CSSProperties; isDrag?: boolean }[] = [
    // Top edge — drag (title bar replacement) — also resizes when only the top strip is grabbed outside the title bar area; we'll keep it pure drag here since resize-n is handled by the corner strip above the content
    { dir: 'n', style: { top: 0, left: CORNER, right: CORNER, height: EDGE, cursor: 'n-resize' } },
    { dir: 's', style: { bottom: 0, left: CORNER, right: CORNER, height: EDGE, cursor: 's-resize' } },
    { dir: 'w', style: { top: CORNER, bottom: CORNER, left: 0, width: EDGE, cursor: 'w-resize' } },
    { dir: 'e', style: { top: CORNER, bottom: CORNER, right: 0, width: EDGE, cursor: 'e-resize' } },
  ]

  return (
    <div
      onMouseDown={onFocus}
      style={{
        position: 'fixed',
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f1e8',
        border: '1.5px solid #c8b888',
        borderRadius: 10,
        boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      {/* Edge drag/resize strips */}
      {edges.map(({ dir, style }) => (
        <div
          key={dir}
          onMouseDown={e => startResize(e, dir)}
          style={{ ...edgeBase, ...style }}
        />
      ))}

      {/* Corner resize handles */}
      {corners.map(({ dir, style }) => (
        <div
          key={dir}
          onMouseDown={e => startResize(e, dir)}
          style={{ ...edgeBase, ...style }}
        >
          {/* Visual indicator only for SE corner */}
          {dir === 'se' && (
            <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderRight: '2px solid #a89868', borderBottom: '2px solid #a89868', borderRadius: 1 }} />
          )}
        </div>
      ))}

      {/* Title bar — also acts as drag handle */}
      <div
        onMouseDown={startDrag}
        style={{
          height: 38,
          background: '#ede8da',
          borderBottom: '1px solid #c8b888',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          cursor: 'move',
          userSelect: 'none',
          flexShrink: 0,
          position: 'relative',
          zIndex: 11,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onClose} aria-label="Fechar"
            style={trafficBtn('#ef4444')}>
            <X size={8} color="#7f1d1d" />
          </button>
          <button onClick={onMinimize} aria-label="Minimizar"
            style={trafficBtn('#fbbf24')}>
            <Minus size={8} color="#78350f" />
          </button>
          <button onClick={onMaximize} aria-label="Maximizar"
            style={trafficBtn('#22c55e')}>
            <Maximize2 size={8} color="#14532d" />
          </button>
        </div>

        {/* Icon + title */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{ flexShrink: 0, opacity: 0.7 }}>{win.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2c2416', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {win.title}
          </span>
        </div>

        <GripVertical size={14} color="#c8b888" style={{ flexShrink: 0 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function trafficBtn(bg: string): React.CSSProperties {
  return {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: bg,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
  }
}

// ─── Desktop ────────────────────────────────────────────��─────────────────────

// ─── Root: detects mobile BEFORE rendering the full OS ────────────────────────
export function CnaeDesktop({ onLogout }: { onLogout?: () => void }) {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileLayout onLogout={onLogout} />
  return <CnaeDesktopOS onLogout={onLogout} />
}

// Wrapper que mantém estado de loading/resultado isolado da janela de resultados
function ResultadosDesktopWrapper({
  resultado: initialResultado,
  onAbrirFicha,
  onPaginar,
  enrichedMap,
  enrichingCnpjs,
  buscaParams,
}: {
  resultado: BuscaResult
  onAbrirFicha: (empresa: Empresa) => void
  onPaginar: (pagina: number) => Promise<void>
  enrichedMap?: Map<string, Empresa>
  enrichingCnpjs?: Set<string>
  buscaParams?: BuscaParams
}) {
  const [resultado, setResultado] = useState(initialResultado)
  const [loading, setLoading] = useState(false)

  // Sincroniza quando uma nova busca substitui o resultado
  useEffect(() => { setResultado(initialResultado) }, [initialResultado])

  const handlePaginar = async (pagina: number) => {
    setLoading(true)
    try {
      await onPaginar(pagina)
      // O pai chama openResultados que recria o wrapper com novo resultado;
      // mas caso queira atualizar inline, o loading é desligado pelo finally abaixo
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResultadosWindow
      resultado={resultado}
      onAbrirFicha={onAbrirFicha}
      loadingPagina={loading}
      onPaginar={handlePaginar}
      enrichedMap={enrichedMap}
      enrichingCnpjs={enrichingCnpjs}
      buscaParams={buscaParams}
    />
  )
}

function CnaeDesktopOS({ onLogout }: { onLogout?: () => void }) {
  const [windows, setWindows] = useState<OsWindow[]>([])
  const [lastResult, setLastResult] = useState<BuscaResult | null>(null)
  const [lastParams, setLastParams] = useState<BuscaParams | null>(null)
  const { enrich, enrichedMap, enrichingCnpjs } = useEnrichment()
  const { podeAcessar, nivel } = usePermissoes()
  const [clock, setClock] = useState('')
  // zTop como ref para evitar reset no hot-reload e conflitos entre renders
  const zTopRef = useRef(100)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])

  const upsertWindow = useCallback((id: string, partial: Partial<OsWindow> & { content: React.ReactNode; title: string; icon: React.ReactNode }) => {
    const z = ++zTopRef.current
    setWindows(prev => {
      const exists = prev.find(w => w.id === id)
      if (exists) {
        return prev.map(w => w.id === id ? { ...w, ...partial, minimized: false, zIndex: z } : w)
      }
      const offset = prev.length * 24
      return [...prev, {
        id,
        x: 160 + offset,
        y: 52 + offset,
        width: partial.width ?? 820,
        height: partial.height ?? 560,
        zIndex: z,
        minimized: false,
        ...partial,
      } as OsWindow]
    })
  }, [])

  const closeWindow = useCallback((id: string) => setWindows(prev => prev.filter(w => w.id !== id)), [])
  const minimizeWindow = useCallback((id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w)), [])
  const focusWindow = useCallback((id: string) => {
    const z = ++zTopRef.current
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: z, minimized: false } : w))
  }, [])
  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w))
  }, [])
  const resizeWindow = useCallback((id: string, width: number, height: number, x?: number, y?: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, width, height, ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) } : w))
  }, [])
  const maximizeWindow = useCallback((id: string) => {
    const z = ++zTopRef.current
    setWindows(prev => prev.map(w => w.id === id
      ? { ...w, x: 0, y: 38, width: window.innerWidth, height: window.innerHeight - 86, zIndex: z }
      : w
    ))
  }, [])

  // Stable refs so callbacks inside windows always call the latest version
  const openResultadosRef = useRef<(r: BuscaResult, p: BuscaParams) => void>(() => {})
  const openFichaRef = useRef<(cnpj: string, base?: Empresa) => void>(() => {})
  const openBuscaRef = useRef<() => void>(() => {})

  // ─ Open Ficha ─
  const openFicha = useCallback((cnpj: string, base?: Empresa) => {
    const id = `ficha-${cnpj.replace(/\D/g, '')}`
    upsertWindow(id, {
      title: `ficha_${cnpj.replace(/\D/g, '')}.cnpj`,
      icon: <Building2 size={13} color="#d97706" />,
      width: 560,
      height: 620,
      content: <FichaWindow cnpj={cnpj} empresaBase={base} />,
    })
  }, [upsertWindow])

  // ref para lastParams para usar dentro de callbacks sem recapturar closure
  const lastParamsRef = useRef<BuscaParams | null>(null)
  useEffect(() => { lastParamsRef.current = lastParams }, [lastParams])

  // ─ Open Resultados ─
  const openResultados = useCallback((result: BuscaResult, params: BuscaParams) => {
    // Disparar enriquecimento em background
    enrich(result.empresas)

    const paginar = async (pagina: number) => {
      const p = lastParamsRef.current
      if (!p) return
      const cnaes = (p.cnae ?? '').split(/[,\s]+/).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(Boolean)
      const porPagina = p.porPagina ?? 50

      const payload: Record<string, unknown> = {
        cnaes,
        inicio: (pagina - 1) * porPagina,
        quantidade: porPagina,
      }
      if (p.uf) payload.estados = [p.uf.toUpperCase()]
      if (p.cnpjs) payload.cnpjs = p.cnpjs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
      if (p.termosBusca) payload.termos_busca = p.termosBusca.split(',').map(t => ({ termo: t.trim(), tipo: p.termoBuscaEm ?? 'A' }))
      if (p.incluirCnaesSecundarios) payload.incluir_cnaes_secundarios = true
      if (p.somenteMatrizes) payload.somente_matrizes = true
      if (p.capitalSocialMinimo) payload.capital_social_minimo = p.capitalSocialMinimo
      if (p.capitalSocialMaximo) payload.capital_social_maximo = p.capitalSocialMaximo
      if (p.simplesNacional === 'apenas') payload.simples_nacional = true
      if (p.simplesNacional === 'excluir') payload.simples_nacional = false
      if (p.mei === 'apenas') payload.mei = true
      if (p.mei === 'excluir') payload.mei = false
      if (p.telefoneObrigatorio) payload.telefone_obrigatorio = true
      if (p.emailObrigatorio) payload.email_obrigatorio = true
      if (p.dataInicio) payload.data_inicio = p.dataInicio
      if (p.dataFim) payload.data_fim = p.dataFim

      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: BuscaResult = await res.json()
      setLastResult(data)
      enrich(data.empresas)
      openResultadosRef.current(data, lastParamsRef.current ?? p)
    }

    upsertWindow('resultados', {
      title: `resultados.cnae — ${result.total.toLocaleString('pt-BR')} empresas`,
      icon: <FileText size={13} color="#d97706" />,
      width: 900,
      height: 560,
      content: (
        <ResultadosDesktopWrapper
          resultado={result}
          onAbrirFicha={(empresa: Empresa) => openFichaRef.current(empresa.cnpj, empresa)}
          onPaginar={paginar}
          enrichedMap={enrichedMap}
          enrichingCnpjs={enrichingCnpjs}
          buscaParams={params}
        />
      ),
    })
  }, [upsertWindow, enrich, enrichedMap, enrichingCnpjs])

  // ─ Open Busca ─
  const openBusca = useCallback(() => {
    upsertWindow('busca', {
      title: 'nova_busca.cnae',
      icon: <Search size={13} color="#d97706" />,
      width: 420,
      height: 520,
      content: (
        <BuscaWindow
          onResultados={(result, params) => {
            setLastResult(result)
            setLastParams(params)
            openResultadosRef.current(result, params)
          }}
        />
      ),
    })
  }, [upsertWindow])

  // ─ Open Terminal ─
  const openTerminal = useCallback(() => {
    upsertWindow('terminal', {
      title: 'terminal.cnae',
      icon: <Terminal size={13} color="#4ade80" />,
      width: 700,
      height: 500,
      content: (
        <CnaeTerminalWindow
          onAbrirBusca={() => openBuscaRef.current()}
          onResultados={(result) => {
            setLastResult(result)
            openResultadosRef.current(result, lastParamsRef.current ?? {})
          }}
          onAbrirFicha={(cnpj) => openFichaRef.current(cnpj)}
        />
      ),
    })
  }, [upsertWindow])

  // ─ Open Admin ─
  const openAdmin = useCallback(() => {
    upsertWindow('admin', {
      title: 'admin_panel.sys',
      icon: <ShieldCheck size={13} color="#d97706" />,
      width: 640,
      height: 480,
      content: <AdminWindow />,
    })
  }, [upsertWindow])

  // ─ Open CNPJ ─
  const openCnpj = useCallback(() => {
    upsertWindow('cnpj', {
      title: 'cnpj_lookup.app',
      icon: <Search size={13} color="#d97706" />,
      width: 600,
      height: 580,
      content: <CnpjWindow />,
    })
  }, [upsertWindow])

  // Keep refs up-to-date
  useEffect(() => { openResultadosRef.current = openResultados }, [openResultados])
  useEffect(() => { openFichaRef.current = openFicha }, [openFicha])
  useEffect(() => { openBuscaRef.current = openBusca }, [openBusca])


  const openWindows = windows.filter(w => !w.minimized)
  const taskbarWindows = windows

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#d4c4a8',
        backgroundImage: 'radial-gradient(#c2b090 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        overflow: 'hidden',
        fontFamily: "'Geist Mono', 'Geist', monospace",
      }}
    >
      {/* ── Menu Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 38,
        background: '#f5f1e8',
        borderBottom: '1.5px solid #c8b888',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 0,
        zIndex: 9999,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 20 }}>
          <div style={{ width: 20, height: 20, background: '#fbbf24', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={12} color="#1a1208" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#2c2416', letterSpacing: '-0.02em' }}>Gotham Search</span>
        </div>

        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {[
            { label: 'Busca', fn: openBusca, icon: <Search size={11} />, modulo: 'busca' as const },
            { label: 'Terminal', fn: openTerminal, icon: <Terminal size={11} />, modulo: 'terminal' as const },
            { label: 'CNPJ', fn: openCnpj, icon: <Search size={11} />, modulo: 'cnpj' as const },
            ...(nivel === 'admin' ? [{ label: 'Admin', fn: openAdmin, icon: <ShieldCheck size={11} />, modulo: 'admin' as const }] : []),
          ].filter(item => podeAcessar(item.modulo)).map(item => (
            <button
              key={item.label}
              onClick={item.fn}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 5,
                fontSize: 12,
                color: '#2c2416',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e0d8c4')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastResult && (
            <span style={{ fontSize: 11, color: '#7a6a4a' }}>
              {lastResult.total.toLocaleString('pt-BR')} empresas
            </span>
          )}
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2c2416', fontFamily: 'monospace' }}>
            {clock}
          </span>
          <button
            onClick={onLogout}
            title="Sair do sistema"
            aria-label="Sair do sistema"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              background: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              color: '#dc2626',
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fecaca' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2' }}
          >
            <LogOut size={12} />
            Sair
          </button>
        </div>
      </div>

      {/* ── Desktop Icons ─────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', left: 16, top: 52, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1 }}>
        {podeAcessar('busca') && (
          <DesktopIcon label="nova_busca" icon={<Search size={20} color="#d97706" />} onClick={openBusca} />
        )}
        {podeAcessar('terminal') && (
          <DesktopIcon label="terminal" icon={<Terminal size={20} color="#4ade80" />} onClick={openTerminal} />
        )}
        {podeAcessar('cnpj') && (
          <DesktopIcon label="cnpj_lookup" icon={<Search size={20} color="#d97706" />} onClick={openCnpj} />
        )}
        {lastResult && podeAcessar('busca') && (
          <DesktopIcon
            label="resultados"
            icon={<FileText size={20} color="#d97706" />}
            onClick={() => openResultados(lastResult, lastParams ?? {})}
          />
        )}
        {nivel === 'admin' && (
          <DesktopIcon label="admin_panel" icon={<ShieldCheck size={20} color="#d97706" />} onClick={openAdmin} />
        )}
      </div>

      {/* ── Windows ───────────────────────────────────────────────────────── */}
      {openWindows.map(win => (
        <OsWindowFrame
          key={win.id}
          win={win}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onMaximize={() => maximizeWindow(win.id)}
          onFocus={() => focusWindow(win.id)}
          onMove={(x, y) => moveWindow(win.id, x, y)}
          onResize={(w, h, x, y) => resizeWindow(win.id, w, h, x, y)}
        >
          {win.content}
        </OsWindowFrame>
      ))}

      {/* ── Taskbar ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 46,
        background: '#f5f1e8',
        borderTop: '1.5px solid #c8b888',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 6,
        zIndex: 9999,
        overflowX: 'auto',
      }}>
        {taskbarWindows.length === 0 ? (
          <span style={{ fontSize: 11, color: '#a89868' }}>Nenhuma janela aberta</span>
        ) : (
          taskbarWindows.map(win => (
            <button
              key={win.id}
              onClick={() => focusWindow(win.id)}
              title={win.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                background: win.minimized ? '#e0d8c4' : '#fef3c7',
                border: win.minimized ? '1px solid #c8b888' : '1px solid #fbbf24',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: '#2c2416',
                cursor: 'pointer',
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
                flexShrink: 0,
              }}
            >
              {win.icon}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{win.title}</span>
            </button>
          ))
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Clock size={14} color="#7a6a4a" />
          <span style={{ fontSize: 11, color: '#7a6a4a', fontFamily: 'monospace' }}>{clock}</span>
        </div>
      </div>
    </div>
  )
}
