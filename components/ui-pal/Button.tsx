'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-info text-background hover:bg-info/90 disabled:bg-info/40 disabled:text-background/50 border border-info',
  secondary:
    'bg-surface text-primary hover:bg-surface-2 border border-border hover:border-border-strong disabled:opacity-50',
  ghost:
    'bg-transparent text-primary hover:bg-surface-2 border border-transparent disabled:opacity-50',
  danger:
    'bg-critical/15 text-critical hover:bg-critical/25 border border-critical/40 disabled:opacity-50',
  success:
    'bg-success/15 text-success hover:bg-success/25 border border-success/40 disabled:opacity-50',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[11px] gap-1.5',
  md: 'h-8 px-3 text-xs gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-[4px] font-medium tracking-wide transition-colors',
          'disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-info',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...rest}
      >
        {loading && (
          <span className="inline-block size-3 rounded-full border-2 border-current border-t-transparent animate-gtm-spin" />
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
