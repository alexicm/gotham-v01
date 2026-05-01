'use client'

import { useEffect, useState } from 'react'
import { LogOut, RefreshCw, Activity } from 'lucide-react'
import { Button } from '@/components/ui-pal/Button'

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
    <header className="h-[38px] border-b border-border bg-surface flex items-center px-3 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 pr-3 border-r border-border">
        <div className="size-5 rounded-[2px] bg-info/20 border border-info/40 flex items-center justify-center">
          <span className="text-[10px] font-bold text-info">G</span>
        </div>
        <span className="text-[13px] font-bold tracking-[0.04em] text-primary">
          GOTHAM
        </span>
        <span className="text-[10px] text-muted font-mono tabular hidden sm:inline">
          v1.0
        </span>
      </div>

      <div className="hidden md:flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">
        <Activity size={10} className="text-success" />
        <span className="font-mono">SYS:OPERATIONAL</span>
      </div>

      <div className="flex-1" />

      {totalEmpresas != null && (
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted font-mono tabular">
          <span className="text-muted/70 uppercase tracking-wider text-[9px]">resultado</span>
          <span className="text-primary">{totalEmpresas.toLocaleString('pt-BR')}</span>
        </div>
      )}

      <span className="text-[12px] font-mono tabular text-primary">{clock}</span>

      {userName && (
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-[11px] text-primary">{userName}</span>
          {userLevel && (
            <span className="text-[9px] uppercase tracking-[0.1em] text-muted font-mono">
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
