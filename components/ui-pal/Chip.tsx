'use client'

import { cn } from '@/lib/cn'
import { type ReactNode, type MouseEventHandler } from 'react'

export function Chip({
  label,
  active,
  onClick,
  onRemove,
  variant = 'default',
}: {
  label: ReactNode
  active?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
  onRemove?: () => void
  variant?: 'default' | 'tag'
}) {
  if (variant === 'tag') {
    return (
      <span className="inline-flex items-center gap-1 rounded-[2px] border border-info/40 bg-info/10 px-1.5 py-0.5 text-[11px] font-semibold text-info font-mono tabular">
        {label}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-info/70 hover:text-info transition-colors"
            aria-label="Remover"
          >
            ×
          </button>
        )}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-[2px] border px-2 h-6 text-[11px] tracking-wide transition-colors',
        active
          ? 'border-info text-info bg-info/12 font-semibold'
          : 'border-border text-muted bg-surface hover:bg-surface-2 hover:text-primary',
      )}
    >
      {label}
    </button>
  )
}
