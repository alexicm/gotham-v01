'use client'

import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function InspectorRail({
  open,
  title,
  meta,
  onClose,
  children,
  width = 340,
}: {
  open: boolean
  title?: ReactNode
  meta?: ReactNode
  onClose?: () => void
  children: ReactNode
  width?: number
}) {
  if (!open) return null
  return (
    <aside
      style={{ width }}
      className={cn(
        'border-l border-border bg-surface flex flex-col flex-shrink-0 min-h-0',
        'animate-gtm-slide-in-right',
      )}
    >
      <header className="h-9 border-b border-border flex items-center justify-between px-3 flex-shrink-0">
        <div className="text-[10px] uppercase tracking-[0.1em] text-muted font-semibold truncate">
          {title}
        </div>
        <div className="flex items-center gap-2">
          {meta && <span className="text-[10px] text-muted font-mono tabular">{meta}</span>}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-primary transition-colors"
              aria-label="Fechar inspector"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
    </aside>
  )
}
