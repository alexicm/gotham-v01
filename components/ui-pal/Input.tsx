'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  mono?: boolean
  leftIcon?: ReactNode
  rightSlot?: ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ invalid, mono, leftIcon, rightSlot, className, containerClassName, ...rest }, ref) => {
    const hasLeft = Boolean(leftIcon)
    const hasRight = Boolean(rightSlot)
    if (!hasLeft && !hasRight) {
      return (
        <input
          ref={ref}
          className={cn(
            'block w-full rounded-[4px] bg-background px-2.5 h-9 text-[13px] text-primary',
            'border outline-none transition-colors placeholder:text-muted',
            invalid ? 'border-critical/60 focus:border-critical' : 'border-border focus:border-info',
            'focus:ring-1 focus:ring-info/40',
            mono && 'font-mono tabular',
            className,
          )}
          {...rest}
        />
      )
    }
    return (
      <div className={cn('relative', containerClassName)}>
        {hasLeft && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'block w-full rounded-[4px] bg-background h-9 text-[13px] text-primary',
            'border outline-none transition-colors placeholder:text-muted',
            invalid ? 'border-critical/60 focus:border-critical' : 'border-border focus:border-info',
            'focus:ring-1 focus:ring-info/40',
            mono && 'font-mono tabular',
            hasLeft ? 'pl-8' : 'pl-2.5',
            hasRight ? 'pr-9' : 'pr-2.5',
            className,
          )}
          {...rest}
        />
        {hasRight && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
