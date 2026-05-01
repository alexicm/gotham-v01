import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Panel({
  children,
  className,
  title,
  meta,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  meta?: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-[4px] border border-border bg-surface flex flex-col min-h-0',
        className,
      )}
    >
      {(title || meta) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-3 h-9 flex-shrink-0">
          {title && (
            <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted">
              {title}
            </div>
          )}
          {meta && <div className="text-[11px] text-muted font-mono tabular">{meta}</div>}
        </header>
      )}
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[4px] border border-border bg-surface p-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function StatLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-[10px] uppercase tracking-[0.1em] text-muted font-semibold', className)}>
      {children}
    </div>
  )
}

export function StatValue({
  children,
  mono,
  className,
}: {
  children: ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn('text-[13px] text-primary', mono && 'font-mono tabular', className)}>
      {children}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-border', className)} />
}
