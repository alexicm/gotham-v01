'use client'

import { Search, FileText, Building2, Brain, ShieldCheck, User, Terminal, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Modulo } from '@/lib/modulos'

export type AppPage =
  | 'busca'
  | 'resultados'
  | 'ficha'
  | 'cnpj'
  | 'intelligence'
  | 'admin'
  | 'perfil'

export interface NavItem {
  id: AppPage
  label: string
  icon: React.ReactNode
  modulo: Modulo
  requiresAdmin?: boolean
  badge?: string | number | null
}

export function Sidebar({
  activePage,
  onNavigate,
  hasResultados,
  podeAcessar,
  isAdmin,
  onOpenTerminal,
}: {
  activePage: AppPage
  onNavigate: (page: AppPage) => void
  hasResultados: boolean
  podeAcessar: (m: Modulo) => boolean
  isAdmin: boolean
  onOpenTerminal: () => void
}) {
  const items: NavItem[] = [
    { id: 'busca', label: 'Busca', icon: <Search size={16} />, modulo: 'busca' },
    {
      id: 'resultados',
      label: 'Resultados',
      icon: <FileText size={16} />,
      modulo: 'busca',
      badge: hasResultados ? '·' : null,
    },
    { id: 'cnpj', label: 'CNPJ Lookup', icon: <Building2 size={16} />, modulo: 'cnpj' },
    { id: 'intelligence', label: 'Intelligence', icon: <Brain size={16} />, modulo: 'intelligence' },
    { id: 'perfil', label: 'Perfil', icon: <User size={16} />, modulo: 'busca' },
  ]

  const visibleItems = items.filter(i => podeAcessar(i.modulo))
  if (isAdmin) {
    visibleItems.push({
      id: 'admin',
      label: 'Admin',
      icon: <ShieldCheck size={16} />,
      modulo: 'admin',
    })
  }

  return (
    <aside className="group w-[56px] hover:w-[200px] transition-[width] duration-200 ease-out border-r border-border bg-surface flex-shrink-0 flex flex-col">
      <div className="h-[38px] border-b border-border flex items-center px-3 flex-shrink-0">
        <BarChart2 size={16} className="text-info flex-shrink-0" />
        <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          NAV
        </span>
      </div>

      <nav className="flex-1 py-2 flex flex-col gap-px">
        {visibleItems.map(item => {
          const active = activePage === item.id
          const isDisabled = item.id === 'resultados' && !hasResultados
          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onNavigate(item.id)}
              title={item.label}
              className={cn(
                'flex items-center gap-3 px-3.5 h-9 text-[12px] transition-colors relative',
                'border-l-2 outline-none focus-visible:bg-surface-2',
                active
                  ? 'border-info text-info bg-info/8'
                  : isDisabled
                    ? 'border-transparent text-muted/40 cursor-not-allowed'
                    : 'border-transparent text-muted hover:text-primary hover:bg-surface-2',
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
              {item.badge && !active && (
                <span className="ml-auto text-info text-[14px] leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {podeAcessar('terminal') && (
        <div className="border-t border-border p-1.5">
          <button
            type="button"
            onClick={onOpenTerminal}
            className="flex items-center gap-3 w-full px-2.5 h-9 rounded-[2px] text-[11px] text-success/80 hover:text-success hover:bg-success/10 transition-colors"
            title="Terminal CNAE"
          >
            <Terminal size={15} className="flex-shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono">
              terminal
            </span>
          </button>
        </div>
      )}
    </aside>
  )
}
