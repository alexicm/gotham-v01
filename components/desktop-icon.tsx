'use client'

import { type LucideIcon } from 'lucide-react'

interface DesktopIconProps {
  label: string
  icon: LucideIcon
  onClick: () => void
}

export function DesktopIcon({ label, icon: Icon, onClick }: DesktopIconProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 w-20 group cursor-pointer"
    >
      <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-300 flex items-center justify-center group-hover:bg-white/90 transition-colors shadow-sm">
        <Icon className="w-6 h-6 text-gray-700" />
      </div>
      <span className="text-xs text-center text-gray-800 font-medium leading-tight px-1 bg-white/60 rounded px-2 py-0.5">
        {label}
      </span>
    </button>
  )
}
