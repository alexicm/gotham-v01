'use client'

import { Activity } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-background bg-grid-tech flex flex-col items-center justify-center font-mono">
      <div className="pointer-events-none absolute top-3 left-3 text-[10px] font-mono uppercase tracking-[0.15em] text-muted/60">
        GOTHAM // SECURE TERMINAL
      </div>
      <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-warning/70">
        <Activity size={10} />
        SYS:BOOTING
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="size-12 rounded-[4px] border border-info/40 bg-info/10 flex items-center justify-center">
          <span className="size-5 rounded-full border-2 border-info/30 border-t-info animate-gtm-spin" />
        </div>
        <div className="text-[18px] font-bold text-primary tracking-[0.04em]">GOTHAM</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-mono animate-gtm-pulse">
          inicializando sistema...
        </div>
      </div>

      <div className="absolute bottom-6 text-[9px] font-mono uppercase tracking-[0.15em] text-muted/50">
        v1.0 · DATA: CNAE · BRASILAPI
      </div>
    </div>
  )
}
