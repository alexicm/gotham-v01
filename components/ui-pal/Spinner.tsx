import { cn } from '@/lib/cn'

export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        'inline-block rounded-full border-2 border-current border-t-transparent animate-gtm-spin',
        className,
      )}
    />
  )
}
