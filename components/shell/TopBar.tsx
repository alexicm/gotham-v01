'use client'

import { useEffect, useState } from 'react'
import { LogOut, RefreshCw, Activity, Wifi, ShieldCheck, Cpu, Database } from 'lucide-react'
import { Button } from '@/components/ui-pal/Button'
import { cn } from '@/lib/cn'

export function TopBar({
  userName,
  userLevel,
  totalEmpresas,
  onLogout,
}: {
  userName?: string
  userLevel?: 'admin' | 'agente' | null
  totalEmpresas?: number
  onLogout?: () => void
}) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="h-[38px] border-b border-border bg-surface flex items-center px-3 gap-3 flex-shrink-0 relative">
      {/* Multi-color accent strip at the very top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px flex">
        <span className="flex-1 bg-info/70" />
        <span className="flex-1 bg-success/70" />
        <span className="flex-1 bg-warning/70" />
        <span className="flex-1 bg-violet/70" />
        <span className="flex-1 bg-critical/70" />
      </div>

      <div className="flex items-center gap-2 pr-3 border-r border-border">
        <div className="size-5 rounded-[2px] bg-info/20 border border-info/40 flex items-center justify-center">
          <span className="text-[10px] font-bold text-info">G</span>
        </div>
        <span className="text-[13px] font-bold tracking-[0.04em] text-primary">GOTHAM</span>
        <span className="text-[10px] text-muted font-mono tabular hidden sm:inline">v1.0</span>
      </div>

      {/* System status segments — multi-color */}
      <div className="hidden lg:flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] font-mono">
        <StatusChip icon={<Cpu size={10} />} label="SYS" value="OK" variant="success" />
        <StatusChip icon={<Wifi size={10} />} label="NET" value="LIVE" variant="info" />
        <StatusChip icon={<Database size={10} />} label="DATA" value="SYNC" variant="violet" />
        {userLevel === 'admin' && (
          <StatusChip icon={<ShieldCheck size={10} />} label="ADM" value="ON" variant="warning" />
        )}
      </div>

      <div className="hidden md:flex lg:hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">
        <Activity size={10} className="text-success" />
        <span className="font-mono">SYS:OPERATIONAL</span>
      </div>

      <div className="flex-1" />

      {totalEmpresas != null && (
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono tabular">
          <span className="text-muted/70 uppercase tracking-wider text-[9px]">contagem</span>
          <span className="text-success font-semibold">
            {totalEmpresas.toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      <span className="text-[12px] font-mono tabular text-primary">{clock}</span>

      {userName && (
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-[11px] text-primary">{userName}</span>
          {userLevel && (
            <span
              className={cn(
                'text-[9px] uppercase tracking-[0.1em] font-mono',
                userLevel === 'admin' ? 'text-warning' : 'text-success',
              )}
            >
              {userLevel}
            </span>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.location.reload()}
        title="Recarregar sistema"
        aria-label="Recarregar sistema"
      >
        <RefreshCw size={12} />
      </Button>

      {onLogout && (
        <Button variant="danger" size="sm" onClick={onLogout} title="Sair">
          <LogOut size={12} />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      )}
    </header>
  )
}

function StatusChip({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode
  label: string
  value: string
  variant: 'info' | 'success' | 'warning' | 'violet'
}) {
  const variantText = {
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    violet: 'text-violet',
  } as const
  const variantBg = {
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    violet: 'bg-violet',
  } as const
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('flex items-center', variantText[variant])}>{icon}</span>
      <span className="text-muted/70">{label}</span>
      <span className="flex items-center gap-1">
        <span className={cn('size-1 rounded-full animate-gtm-pulse', variantBg[variant])} />
        <span className={variantText[variant]}>{value}</span>
      </span>
    </span>
  )
}
