'use client'

import { cn } from '@/lib/cn'
import { type ReactNode } from 'react'

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T
  onChange: (v: T) => void
  items: { id: T; label: ReactNode; badge?: number | string }[]
  className?: string
}) {
  return (
    <div className={cn('flex border-b border-border', className)}>
      {items.map(t => {
        const active = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'relative px-3 h-9 text-[11px] uppercase tracking-[0.08em] font-semibold transition-colors',
              active ? 'text-info' : 'text-muted hover:text-primary',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {t.badge != null && t.badge !== '' && (
                <span
                  className={cn(
                    'rounded-[2px] px-1 text-[9px] font-mono tabular',
                    active ? 'bg-info/20 text-info' : 'bg-surface-2 text-muted',
                  )}
                >
                  {t.badge}
                </span>
              )}
            </span>
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-info" />}
          </button>
        )
      })}
    </div>
  )
}
