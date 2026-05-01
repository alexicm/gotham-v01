'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { type ReactNode } from 'react'

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  className?: string
}) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer text-[12px] text-primary select-none',
        className,
      )}
    >
      <span
        onClick={() => onChange(!checked)}
        className={cn(
          'flex items-center justify-center size-4 rounded-[2px] border transition-colors flex-shrink-0',
          checked ? 'bg-info border-info' : 'bg-background border-border hover:border-border-strong',
        )}
      >
        {checked && <Check size={11} className="text-background" strokeWidth={3} />}
      </span>
      <span>{label}</span>
    </label>
  )
}
