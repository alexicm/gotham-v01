import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'info' | 'warning' | 'success' | 'critical' | 'violet' | 'muted'

const variantStyles: Record<Variant, string> = {
  info: 'bg-info/15 text-info border-info/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  success: 'bg-success/15 text-success border-success/30',
  critical: 'bg-critical/15 text-critical border-critical/30',
  violet: 'bg-violet/15 text-violet border-violet/30',
  muted: 'bg-surface-2 text-muted border-border',
}

export function Badge({
  children,
  variant = 'muted',
  className,
  uppercase = true,
  mono = false,
}: {
  children: ReactNode
  variant?: Variant
  className?: string
  uppercase?: boolean
  mono?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-px text-[10px] font-semibold tracking-[0.04em] whitespace-nowrap',
        uppercase && 'uppercase',
        mono && 'font-mono tabular',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function situacaoVariant(situacao?: string): Variant {
  const s = (situacao ?? '').toUpperCase()
  if (s.includes('ATIVA')) return 'success'
  if (s.includes('SUSPENSA') || s.includes('INAPTA')) return 'warning'
  if (s.includes('BAIXADA') || s.includes('NULA')) return 'critical'
  return 'muted'
}
