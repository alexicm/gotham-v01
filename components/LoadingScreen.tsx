'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  Radar,
  ShieldCheck,
  Database,
  Wifi,
  Cpu,
  Lock,
  Crosshair,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface BootLine {
  label: string
  status: 'pending' | 'loading' | 'ok' | 'warn'
  variant: 'info' | 'success' | 'warning' | 'violet'
  delayMs: number
  durationMs: number
}

const BOOT_SEQUENCE: BootLine[] = [
  { label: 'INIT KERNEL · NEXT.JS RUNTIME', status: 'pending', variant: 'info', delayMs: 80, durationMs: 220 },
  { label: 'MOUNT SECURE STORAGE · SUPABASE', status: 'pending', variant: 'success', delayMs: 220, durationMs: 260 },
  { label: 'LOAD CIPHER MODULES · AUTH GUARD', status: 'pending', variant: 'warning', delayMs: 380, durationMs: 200 },
  { label: 'ESTABLISH UPLINK · BRASILAPI', status: 'pending', variant: 'info', delayMs: 540, durationMs: 240 },
  { label: 'CALIBRATE INTELLIGENCE · OPENAI', status: 'pending', variant: 'violet', delayMs: 720, durationMs: 220 },
  { label: 'SYNC PERMISSION TABLE · RLS', status: 'pending', variant: 'success', delayMs: 880, durationMs: 180 },
  { label: 'ENGAGE TACTICAL INTERFACE · UI', status: 'pending', variant: 'info', delayMs: 1020, durationMs: 200 },
]

const STATUS_BARS: { label: string; variant: 'info' | 'success' | 'warning' | 'violet'; delayMs: number }[] = [
  { label: 'POWER',   variant: 'success', delayMs: 60  },
  { label: 'NETWORK', variant: 'info',    delayMs: 220 },
  { label: 'AUTH',    variant: 'warning', delayMs: 380 },
  { label: 'IA CORE', variant: 'violet',  delayMs: 540 },
  { label: 'DATA',    variant: 'success', delayMs: 700 },
]

const VARIANT_TEXT = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  violet: 'text-violet',
} as const

const VARIANT_BG_DIM = {
  info: 'bg-info/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  violet: 'bg-violet/10',
} as const

const VARIANT_BG_STRONG = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  violet: 'bg-violet',
} as const

const VARIANT_BORDER = {
  info: 'border-info/40',
  success: 'border-success/40',
  warning: 'border-warning/40',
  violet: 'border-violet/40',
} as const

export function LoadingScreen() {
  const [tick, setTick] = useState(0)
  const [progress, setProgress] = useState(0)
  const [utc, setUtc] = useState(() => new Date().toISOString())
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10).toUpperCase())

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 33)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setUtc(new Date().toISOString()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const TOTAL = 1500
    function step(now: number) {
      const elapsed = now - start
      const p = Math.min(elapsed / TOTAL, 1)
      // ease-out cubic for satisfying ramp
      const eased = 1 - Math.pow(1 - p, 3)
      setProgress(eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const radarAngle = (tick * 4) % 360 // ~120 deg/sec
  const elapsedMs = tick * 33

  return (
    <div className="fixed inset-0 z-[9999] bg-background bg-grid-tech overflow-hidden font-mono select-none">
      {/* Vignette + scanline ambient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Outer frame brackets */}
      <div className="pointer-events-none absolute inset-4 border border-border/40">
        {/* Bracket corners */}
        {([
          'top-0 left-0 border-l-2 border-t-2',
          'top-0 right-0 border-r-2 border-t-2',
          'bottom-0 left-0 border-l-2 border-b-2',
          'bottom-0 right-0 border-r-2 border-b-2',
        ] as const).map((cls, i) => (
          <span
            key={i}
            className={cn(
              'absolute size-6 border-info/70',
              cls,
            )}
          />
        ))}
      </div>

      {/* Top HUD */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
        <div className="flex items-center gap-3 text-muted/70">
          <span className="text-info">●</span>
          <span>GOTHAM // OPS-CENTER</span>
          <span className="text-muted/40">|</span>
          <span className="text-warning">SECURE BOOT</span>
        </div>
        <div className="flex items-center gap-3 text-muted/70">
          <span>UTC <span className="text-primary">{utc}</span></span>
          <span className="text-muted/40">|</span>
          <span>SID <span className="text-info">{sessionId}</span></span>
          <span className="text-muted/40">|</span>
          <span className="flex items-center gap-1 text-success">
            <Activity size={10} />
            LIVE
          </span>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-muted/60">
        <span>LAT 23°33'S · LON 46°38'W</span>
        <span>v1.0 · DATA: CNAE · BRASILAPI</span>
        <span className="flex items-center gap-1.5">
          <Lock size={9} className="text-warning" />
          ENCRYPTED CHANNEL
        </span>
      </div>

      {/* Side rail — left */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 text-[9px] uppercase tracking-[0.15em] text-muted/60">
        {['NORTH','EAST','SOUTH','WEST'].map((d, i) => (
          <div key={d} className="flex items-center gap-2">
            <span className={cn('size-1.5 rounded-full', i === 0 ? 'bg-info' : 'bg-muted/30')} />
            {d}
          </div>
        ))}
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-1 text-[9px] uppercase tracking-[0.15em] text-muted/50 items-end">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="flex items-center gap-2">
            {String(i * 10).padStart(3, '0')}
            <span className={cn('block w-3 h-px', i % 5 === 0 ? 'bg-info' : 'bg-muted/30')} />
          </span>
        ))}
      </div>

      {/* Center stack */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        {/* Radar / crosshair composition */}
        <div className="relative size-[260px] sm:size-[300px] mb-8">
          {/* Outer ring with marks */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full text-info">
            <defs>
              <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3FB950" stopOpacity="0" />
                <stop offset="100%" stopColor="#3FB950" stopOpacity="0.45" />
              </linearGradient>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#58A6FF" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#58A6FF" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#58A6FF" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="100" cy="100" r="95" fill="url(#centerGlow)" />

            {/* Outer ticks ring */}
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i * 360) / 60
              const long = i % 5 === 0
              const x1 = 100 + Math.cos((angle - 90) * (Math.PI / 180)) * (long ? 88 : 92)
              const y1 = 100 + Math.sin((angle - 90) * (Math.PI / 180)) * (long ? 88 : 92)
              const x2 = 100 + Math.cos((angle - 90) * (Math.PI / 180)) * 96
              const y2 = 100 + Math.sin((angle - 90) * (Math.PI / 180)) * 96
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="currentColor"
                  strokeOpacity={long ? 0.7 : 0.25}
                  strokeWidth={long ? 1 : 0.5}
                />
              )
            })}

            {/* Concentric rings */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeOpacity="0.15" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeOpacity="0.2" />

            {/* Crosshair lines */}
            <line x1="100" y1="2" x2="100" y2="20" stroke="currentColor" strokeOpacity="0.6" />
            <line x1="100" y1="180" x2="100" y2="198" stroke="currentColor" strokeOpacity="0.6" />
            <line x1="2" y1="100" x2="20" y2="100" stroke="currentColor" strokeOpacity="0.6" />
            <line x1="180" y1="100" x2="198" y2="100" stroke="currentColor" strokeOpacity="0.6" />

            {/* Radar sweep cone (rotating) */}
            <g style={{ transform: `rotate(${radarAngle}deg)`, transformOrigin: '100px 100px', transition: 'none' }}>
              <path
                d="M 100,100 L 195,100 A 95,95 0 0 0 162,28 Z"
                fill="url(#radarSweep)"
              />
              <line
                x1="100" y1="100" x2="195" y2="100"
                stroke="#3FB950"
                strokeWidth="1.2"
                strokeOpacity="0.85"
              />
            </g>

            {/* Animated targets (fixed) */}
            <circle cx="138" cy="62"  r="2" fill="#F85149" className="animate-gtm-pulse" />
            <circle cx="64"  cy="138" r="1.5" fill="#D29922" className="animate-gtm-pulse" style={{ animationDelay: '0.4s' }} />
            <circle cx="148" cy="148" r="1.5" fill="#A371F7" className="animate-gtm-pulse" style={{ animationDelay: '0.8s' }} />

            {/* Center reticle */}
            <g className="text-info">
              <circle cx="100" cy="100" r="6" fill="none" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.4" />
              <circle cx="100" cy="100" r="2" fill="currentColor" />
            </g>
          </svg>

          {/* Counter-rotating outer brackets */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `rotate(${-radarAngle * 0.35}deg)` }}
          >
            {([
              'top-0 left-1/2 -translate-x-1/2',
              'right-0 top-1/2 -translate-y-1/2',
              'bottom-0 left-1/2 -translate-x-1/2',
              'left-0 top-1/2 -translate-y-1/2',
            ] as const).map((cls, i) => (
              <span
                key={i}
                className={cn('absolute block size-3 border-info/70', cls, [
                  'border-t-2 border-l-2',
                  'border-t-2 border-r-2',
                  'border-b-2 border-r-2',
                  'border-b-2 border-l-2',
                ][i])}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="text-[44px] sm:text-[56px] font-bold text-primary tracking-[0.08em] leading-none"
            style={{
              textShadow:
                '0 0 22px rgba(88,166,255,0.42), 0 0 60px rgba(88,166,255,0.18)',
            }}
          >
            GOTHAM
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-muted">
            <span className="block w-8 h-px bg-info/60" />
            <Crosshair size={10} className="text-info" />
            TACTICAL INTELLIGENCE SYSTEM
            <Crosshair size={10} className="text-info" />
            <span className="block w-8 h-px bg-info/60" />
          </div>
        </div>

        {/* Progress bar — primary */}
        <div className="mt-7 w-full max-w-[480px]">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-muted mb-1.5">
            <span className="text-info flex items-center gap-1.5">
              <Cpu size={9} />
              SYSTEM BOOT
            </span>
            <span className="font-mono tabular text-primary">
              {Math.round(progress * 100).toString().padStart(3, '0')}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-surface-2 overflow-hidden border border-border">
            <div
              className="h-full bg-gradient-to-r from-info via-violet to-success transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[9px] font-mono tabular text-muted/60">
            <span>0x{(elapsedMs).toString(16).toUpperCase().padStart(6, '0')}</span>
            <span className="text-success animate-gtm-pulse">▮ STREAMING</span>
            <span>EOF: 0x000005DC</span>
          </div>
        </div>

        {/* Status bars row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2 w-full max-w-[560px]">
          {STATUS_BARS.map(b => (
            <StatusBar key={b.label} {...b} elapsedMs={elapsedMs} />
          ))}
        </div>

        {/* Boot sequence log */}
        <div className="mt-6 w-full max-w-[560px] rounded-[2px] border border-border bg-surface/60 backdrop-blur-[1px]">
          <div className="px-3 h-7 border-b border-border flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-muted">
            <span className="flex items-center gap-1.5">
              <Radar size={9} className="text-success" />
              BOOT SEQUENCE
            </span>
            <span className="text-success flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success animate-gtm-pulse" />
              SECURE
            </span>
          </div>
          <div className="p-2.5 space-y-1">
            {BOOT_SEQUENCE.map((line, i) => (
              <BootLineRow key={i} line={line} elapsedMs={elapsedMs} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBar({
  label,
  variant,
  delayMs,
  elapsedMs,
}: {
  label: string
  variant: 'info' | 'success' | 'warning' | 'violet'
  delayMs: number
  elapsedMs: number
}) {
  const local = Math.max(0, elapsedMs - delayMs)
  const pct = Math.min(local / 800, 1)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em]">
        <span className={cn('font-semibold', VARIANT_TEXT[variant])}>{label}</span>
        <span className="font-mono tabular text-muted">
          {Math.round(pct * 100).toString().padStart(3, '0')}
        </span>
      </div>
      <div className={cn('h-0.5 overflow-hidden', VARIANT_BG_DIM[variant])}>
        <div
          className={cn('h-full transition-[width] duration-100', VARIANT_BG_STRONG[variant])}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

function BootLineRow({
  line,
  elapsedMs,
  index,
}: {
  line: BootLine
  elapsedMs: number
  index: number
}) {
  const local = elapsedMs - line.delayMs
  const status: 'pending' | 'loading' | 'ok' =
    local < 0 ? 'pending' : local < line.durationMs ? 'loading' : 'ok'

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-[10px] font-mono tabular tracking-wide transition-opacity',
        status === 'pending' ? 'opacity-25' : 'opacity-100',
      )}
    >
      <span className="text-muted/50 w-4 text-right">
        {String(index).padStart(2, '0')}
      </span>
      <BootLineIcon variant={line.variant} status={status} />
      <span
        className={cn(
          'flex-1 truncate',
          status === 'ok'
            ? 'text-primary'
            : status === 'loading'
              ? VARIANT_TEXT[line.variant]
              : 'text-muted',
        )}
      >
        {line.label}
      </span>
      <span className="font-mono tabular text-[9px]">
        {status === 'ok' && <span className="text-success">[ OK ]</span>}
        {status === 'loading' && (
          <span className={cn('animate-gtm-pulse', VARIANT_TEXT[line.variant])}>
            [ ... ]
          </span>
        )}
        {status === 'pending' && <span className="text-muted/40">[----]</span>}
      </span>
    </div>
  )
}

function BootLineIcon({
  variant,
  status,
}: {
  variant: 'info' | 'success' | 'warning' | 'violet'
  status: 'pending' | 'loading' | 'ok'
}) {
  const Icon =
    variant === 'info'
      ? Wifi
      : variant === 'success'
        ? Database
        : variant === 'warning'
          ? ShieldCheck
          : Cpu
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center size-4 rounded-[2px] border',
        status === 'pending'
          ? 'border-border bg-surface text-muted/40'
          : cn(VARIANT_BORDER[variant], VARIANT_BG_DIM[variant], VARIANT_TEXT[variant]),
      )}
    >
      <Icon size={9} />
    </span>
  )
}
