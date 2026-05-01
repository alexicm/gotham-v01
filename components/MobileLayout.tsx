'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Search,
  FileText,
  Building2,
  Brain,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Activity,
  X,
} from 'lucide-react'
import type { Empresa, BuscaResult, BuscaParams } from '@/types/empresa'
import { useEnrichment } from '@/hooks/useEnrichment'
import { usePermissoes } from '@/hooks/usePermissoes'
import { BuscaPage } from '@/components/pages/BuscaPage'
import { ResultadosPage } from '@/components/pages/ResultadosPage'
import { FichaPage } from '@/components/pages/FichaPage'
import { CnpjPage } from '@/components/pages/CnpjPage'
import { IntelligencePage } from '@/components/pages/IntelligencePage'
import { AdminPage } from '@/components/pages/AdminPage'
import { PerfilPage } from '@/components/pages/PerfilPage'
import { InspectorEmpresa } from '@/components/pages/InspectorEmpresa'
import type { AppPage } from '@/components/shell/Sidebar'
import { cn } from '@/lib/cn'

type ModuleCard = {
  id: AppPage
  label: string
  icon: React.ReactNode
  desc: string
  variant: 'info' | 'warning' | 'success' | 'violet'
  enabled: boolean
}

export function MobileLayout({ onLogout }: { onLogout?: () => void }) {
  const [page, setPage] = useState<AppPage | 'home'>('home')
  const [resultado, setResultado] = useState<BuscaResult | null>(null)
  const [params, setParams] = useState<BuscaParams | null>(null)
  const [fichaTarget, setFichaTarget] = useState<{ cnpj: string; base?: Empresa } | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<Empresa | null>(null)
  const [intelligenceEmpresa, setIntelligenceEmpresa] = useState<Empresa | null>(null)
  const [loadingPagina, setLoadingPagina] = useState(false)
  const paramsRef = useRef<BuscaParams | null>(null)

  const { enrich, enrichedMap, enrichingCnpjs } = useEnrichment()
  const { podeAcessar, nivel } = usePermissoes()

  const handleResultados = useCallback(
    (r: BuscaResult, p: BuscaParams) => {
      setResultado(r)
      setParams(p)
      paramsRef.current = p
      enrich(r.empresas)
      setPage('resultados')
    },
    [enrich],
  )

  const handlePaginar = useCallback(async (pagina: number) => {
    const p = paramsRef.current
    if (!p) return
    setLoadingPagina(true)
    const cnaes = (p.cnae ?? '')
      .split(/[,\s]+/)
      .map(c => parseInt(c.replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n) && n > 0)
    const porPagina = p.porPagina ?? 50
    const newParams: BuscaParams = { ...p, pagina }
    paramsRef.current = newParams
    setParams(newParams)
    const payload: Record<string, unknown> = {
      cnaes,
      inicio: (pagina - 1) * porPagina,
      quantidade: porPagina,
    }
    if (p.ufs && p.ufs.length > 0) payload.estados = p.ufs
    else if (p.uf) payload.estados = [p.uf.toUpperCase()]
    try {
      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: BuscaResult = await res.json()
      setResultado(data)
    } finally {
      setLoadingPagina(false)
    }
  }, [])

  const handleAbrirFicha = useCallback((e: Empresa) => {
    setFichaTarget({ cnpj: e.cnpj, base: e })
    setSelectedSheet(null)
    setPage('ficha')
  }, [])

  const handleAnalisarIA = useCallback((e: Empresa) => {
    setIntelligenceEmpresa(e)
    setSelectedSheet(null)
    setPage('intelligence')
  }, [])

  const cards: ModuleCard[] = [
    {
      id: 'busca',
      label: 'Busca',
      icon: <Search size={18} />,
      desc: 'Empresas por CNAE, UF, termos e mais',
      variant: 'info',
      enabled: podeAcessar('busca'),
    },
    {
      id: 'resultados',
      label: 'Resultados',
      icon: <FileText size={18} />,
      desc: resultado
        ? `${resultado.total.toLocaleString('pt-BR')} empresas`
        : 'Nenhuma busca executada',
      variant: 'success',
      enabled: podeAcessar('busca') && !!resultado,
    },
    {
      id: 'cnpj',
      label: 'CNPJ Lookup',
      icon: <Building2 size={18} />,
      desc: 'Consulta direta via BrasilAPI',
      variant: 'info',
      enabled: podeAcessar('cnpj'),
    },
    {
      id: 'intelligence',
      label: 'Intelligence',
      icon: <Brain size={18} />,
      desc: 'Análise por IA + dados em tempo real',
      variant: 'violet',
      enabled: podeAcessar('intelligence'),
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: <User size={18} />,
      desc: 'Seus dados, permissões e histórico',
      variant: 'warning',
      enabled: podeAcessar('busca'),
    },
    ...(nivel === 'admin'
      ? [
          {
            id: 'admin' as const,
            label: 'Admin',
            icon: <ShieldCheck size={18} />,
            desc: 'Gestão de usuários',
            variant: 'warning' as const,
            enabled: true,
          },
        ]
      : []),
  ]

  const titles: Record<AppPage, string> = {
    busca: 'NOVA BUSCA',
    resultados: 'RESULTADOS',
    ficha: 'FICHA EMPRESA',
    cnpj: 'CNPJ LOOKUP',
    intelligence: 'INTELLIGENCE',
    admin: 'ADMIN',
    perfil: 'PERFIL',
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden font-sans">
      {/* TopBar mobile */}
      <header className="h-[44px] border-b border-border bg-surface flex items-center px-3 gap-3 flex-shrink-0">
        {page !== 'home' && (
          <button
            type="button"
            onClick={() => {
              if (page === 'ficha') setPage('resultados')
              else setPage('home')
            }}
            className="size-8 rounded-[2px] border border-border bg-surface-2 flex items-center justify-center text-muted hover:text-primary"
            aria-label="Voltar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="size-5 rounded-[2px] bg-info/20 border border-info/40 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-info">G</span>
          </div>
          <span className="text-[12px] font-bold text-primary tracking-[0.04em] truncate">
            {page === 'home' ? 'GOTHAM' : titles[page]}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-success/80 font-mono">
          <Activity size={10} />
          OPERATIONAL
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="h-7 px-2 rounded-[2px] border border-critical/40 bg-critical/10 text-critical text-[11px] font-semibold flex items-center gap-1"
            aria-label="Sair"
          >
            <LogOut size={11} />
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {page === 'home' && (
          <HomeStack
            cards={cards}
            onSelect={p => {
              if (p === 'resultados' && !resultado) return
              setPage(p)
            }}
            onLogout={onLogout}
          />
        )}

        {page === 'busca' && <BuscaPage onResultados={handleResultados} />}

        {page === 'resultados' &&
          (resultado ? (
            <ResultadosPage
              resultado={resultado}
              buscaParams={params ?? undefined}
              enrichedMap={enrichedMap}
              enrichingCnpjs={enrichingCnpjs}
              loadingPagina={loadingPagina}
              selectedCnpj={selectedSheet?.cnpj ?? null}
              onSelect={e => setSelectedSheet(e)}
              onAbrirFicha={handleAbrirFicha}
              onPaginar={handlePaginar}
            />
          ) : (
            <EmptyMobile title="Nenhuma busca executada" />
          ))}

        {page === 'ficha' &&
          (fichaTarget ? (
            <FichaPage
              cnpj={fichaTarget.cnpj}
              empresaBase={fichaTarget.base}
              onBack={() => setPage('resultados')}
              onAnalisarIA={handleAnalisarIA}
            />
          ) : (
            <EmptyMobile title="Nenhuma ficha selecionada" />
          ))}

        {page === 'cnpj' && <CnpjPage />}

        {page === 'intelligence' && (
          <IntelligencePage empresaInicial={intelligenceEmpresa ?? undefined} />
        )}

        {page === 'admin' && nivel === 'admin' && <AdminPage />}

        {page === 'perfil' && <PerfilPage />}
      </div>

      {/* Bottom sheet — preview da empresa selecionada nos resultados */}
      {selectedSheet && page === 'resultados' && (
        <BottomSheet
          onClose={() => setSelectedSheet(null)}
        >
          <InspectorEmpresa
            empresa={enrichedMap?.get(selectedSheet.cnpj) ?? selectedSheet}
            onAbrirFicha={() =>
              handleAbrirFicha(enrichedMap?.get(selectedSheet.cnpj) ?? selectedSheet)
            }
            onAnalisarIA={() =>
              handleAnalisarIA(enrichedMap?.get(selectedSheet.cnpj) ?? selectedSheet)
            }
          />
        </BottomSheet>
      )}
    </div>
  )
}

function HomeStack({
  cards,
  onSelect,
}: {
  cards: ModuleCard[]
  onSelect: (p: AppPage) => void
  onLogout?: () => void
}) {
  return (
    <div className="h-full overflow-y-auto p-3 space-y-2 animate-gtm-fade-in">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted font-mono px-1 pt-1 pb-2">
        MÓDULOS DISPONÍVEIS
      </div>
      {cards.map(card => {
        const variantBorder: Record<ModuleCard['variant'], string> = {
          info: 'border-info/30',
          warning: 'border-warning/30',
          success: 'border-success/30',
          violet: 'border-violet/30',
        }
        const variantText: Record<ModuleCard['variant'], string> = {
          info: 'text-info',
          warning: 'text-warning',
          success: 'text-success',
          violet: 'text-violet',
        }
        return (
          <button
            key={card.id}
            type="button"
            disabled={!card.enabled}
            onClick={() => onSelect(card.id)}
            className={cn(
              'w-full rounded-[4px] border bg-surface flex items-center gap-3 p-3 text-left transition-colors',
              card.enabled
                ? `${variantBorder[card.variant]} hover:bg-surface-2`
                : 'border-border/50 opacity-50 cursor-not-allowed',
            )}
          >
            <div
              className={cn(
                'size-9 rounded-[2px] border flex items-center justify-center flex-shrink-0',
                variantBorder[card.variant],
                'bg-background',
                variantText[card.variant],
              )}
            >
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-primary leading-tight">
                {card.label}
              </div>
              <div className="text-[11px] text-muted truncate">{card.desc}</div>
            </div>
            <ChevronRight size={14} className="text-muted flex-shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

function EmptyMobile({ title }: { title: string }) {
  return (
    <div className="h-full flex items-center justify-center text-muted text-[12px] p-6 text-center">
      {title}
    </div>
  )
}

function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[85vh] bg-surface border-t border-border rounded-t-[4px] overflow-y-auto animate-gtm-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end px-2 py-1 sticky top-0 bg-surface border-b border-border">
          <button
            type="button"
            onClick={onClose}
            className="size-7 rounded-[2px] text-muted hover:text-primary"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
