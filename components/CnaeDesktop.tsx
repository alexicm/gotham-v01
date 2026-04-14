'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search, Terminal, FileText, Building2, Clock, BarChart2,
  X, Minus, Maximize2, GripVertical
} from 'lucide-react'
import { BuscaWindow } from './windows/BuscaWindow'
import { ResultadosWindow } from './windows/ResultadosWindow'
import { FichaWindow } from './windows/FichaWindow'
import { CnaeTerminalWindow } from './windows/CnaeTerminalWindow'
import { MobileLayout } from './MobileLayout'
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
  onResize: (w: number, h: number) => void
  children: React.ReactNode
}) {
  const dragging = useRef(false)
  const resizing = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 })

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragging.current) {
        onMove(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y)
      }
      if (resizing.current) {
        const dx = e.clientX - resizeStart.current.mx
        const dy = e.clientY - resizeStart.current.my
        onResize(
          Math.max(380, resizeStart.current.w + dx),
          Math.max(280, resizeStart.current.h + dy)
        )
      }
    }
    function onMouseUp() {
      dragging.current = false
      resizing.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMove, onResize])

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
      {/* Title bar */}
      <div
        onMouseDown={e => {
          if ((e.target as HTMLElement).closest('button')) return
          dragging.current = true
          dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y }
          onFocus()
        }}
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

      {/* Resize handle */}
      <div
        onMouseDown={e => {
          e.stopPropagation()
          resizing.current = true
          resizeStart.current = { mx: e.clientX, my: e.clientY, w: win.width, h: win.height }
        }}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 16,
          height: 16,
          cursor: 'se-resize',
          zIndex: 1,
        }}
      >
        <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderRight: '2px solid #a89868', borderBottom: '2px solid #a89868', borderRadius: 1 }} />
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
export function CnaeDesktop() {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileLayout />
  return <CnaeDesktopOS />
}

let zTop = 100

function CnaeDesktopOS() {
  const [windows, setWindows] = useState<OsWindow[]>([])
  const [lastResult, setLastResult] = useState<BuscaResult | null>(null)
  const [lastParams, setLastParams] = useState<BuscaParams | null>(null)
  const [loadingPagina, setLoadingPagina] = useState(false)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  const upsertWindow = useCallback((id: string, partial: Partial<OsWindow> & { content: React.ReactNode; title: string; icon: React.ReactNode }) => {
    zTop++
    const z = zTop
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

  const closeWindow = (id: string) => setWindows(prev => prev.filter(w => w.id !== id))
  const minimizeWindow = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w))
  const focusWindow = useCallback((id: string) => {
    zTop++
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: zTop, minimized: false } : w))
  }, [])
  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w))
  }, [])
  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, width, height } : w))
  }, [])
  const maximizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, x: 0, y: 38, width: window.innerWidth, height: window.innerHeight - 86, zIndex: ++zTop } : w))
  }

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

  // ─ Open Resultados ─
  const openResultados = useCallback((result: BuscaResult, params: BuscaParams) => {
    upsertWindow('resultados', {
      title: `resultados.cnae — ${result.total.toLocaleString('pt-BR')} empresas`,
      icon: <FileText size={13} color="#d97706" />,
      width: 900,
      height: 560,
      content: (
        <ResultadosWindow
          resultado={result}
          onAbrirFicha={(empresa: Empresa) => openFichaRef.current(empresa.cnpj, empresa)}
          loadingPagina={false}
          onPaginar={async (pagina) => {
            if (!params) return
            setLoadingPagina(true)
            const cnaes = (params.cnae ?? '').split(/[,\s]+/).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(Boolean)
            const porPagina = params.porPagina ?? 50
            const payload: Record<string, unknown> = {
              cnaes,
              inicio: (pagina - 1) * porPagina,
              quantidade: porPagina,
            }
            if (params.uf) payload.estados = [params.uf.toUpperCase()]
            try {
              const res = await fetch('/api/busca-cnae', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
              const data: BuscaResult = await res.json()
              setLastResult(data)
              openResultadosRef.current(data, params)
            } finally {
              setLoadingPagina(false)
            }
          }}
        />
      ),
    })
  }, [upsertWindow])

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
            openResultadosRef.current(result, lastParams ?? {})
          }}
          onAbrirFicha={(cnpj) => openFichaRef.current(cnpj)}
        />
      ),
    })
  }, [upsertWindow, lastParams])

  // Keep refs up-to-date
  useEffect(() => { openResultadosRef.current = openResultados }, [openResultados])
  useEffect(() => { openFichaRef.current = openFicha }, [openFicha])
  useEffect(() => { openBuscaRef.current = openBusca }, [openBusca])

  // Bootstrap: open busca + terminal on first load
  useEffect(() => {
    openBusca()
    openTerminal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <span style={{ fontSize: 13, fontWeight: 800, color: '#2c2416', letterSpacing: '-0.02em' }}>CNAE OS</span>
        </div>

        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {[
            { label: 'Busca', fn: openBusca, icon: <Search size={11} /> },
            { label: 'Terminal', fn: openTerminal, icon: <Terminal size={11} /> },
          ].map(item => (
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
        </div>
      </div>

      {/* ── Desktop Icons ─────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', left: 16, top: 52, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1 }}>
        <DesktopIcon label="nova_busca" icon={<Search size={20} color="#d97706" />} onClick={openBusca} />
        <DesktopIcon label="terminal" icon={<Terminal size={20} color="#4ade80" />} onClick={openTerminal} />
        {lastResult && (
          <DesktopIcon
            label="resultados"
            icon={<FileText size={20} color="#d97706" />}
            onClick={() => openResultados(lastResult, lastParams ?? {})}
          />
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
          onResize={(w, h) => resizeWindow(win.id, w, h)}
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
