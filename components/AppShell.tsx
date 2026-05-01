'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TopBar } from '@/components/shell/TopBar'
import { Sidebar, type AppPage } from '@/components/shell/Sidebar'
import { InspectorRail } from '@/components/shell/InspectorRail'
import { TerminalOverlay } from '@/components/shell/TerminalOverlay'
import { TerminalPasswordGate } from '@/components/TerminalPasswordGate'
import { SearchScanOverlay } from '@/components/maps/SearchScanOverlay'
import { BuscaPage } from '@/components/pages/BuscaPage'
import { ResultadosPage } from '@/components/pages/ResultadosPage'
import { FichaPage } from '@/components/pages/FichaPage'
import { CnpjPage } from '@/components/pages/CnpjPage'
import { IntelligencePage } from '@/components/pages/IntelligencePage'
import { AdminPage } from '@/components/pages/AdminPage'
import { PerfilPage } from '@/components/pages/PerfilPage'
import { InspectorEmpresa } from '@/components/pages/InspectorEmpresa'
import { MobileLayout } from '@/components/MobileLayout'
import { useEnrichment } from '@/hooks/useEnrichment'
import { usePermissoes } from '@/hooks/usePermissoes'
import { createClient } from '@/lib/supabase/client'
import type { Empresa, BuscaResult, BuscaParams } from '@/types/empresa'

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

export function AppShell({ onLogout }: { onLogout?: () => void }) {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileLayout onLogout={onLogout} />
  return <DesktopShell onLogout={onLogout} />
}

function DesktopShell({ onLogout }: { onLogout?: () => void }) {
  const [activePage, setActivePage] = useState<AppPage>('busca')
  const [resultado, setResultado] = useState<BuscaResult | null>(null)
  const [params, setParams] = useState<BuscaParams | null>(null)
  const [selected, setSelected] = useState<Empresa | null>(null)
  const [fichaTarget, setFichaTarget] = useState<{ cnpj: string; base?: Empresa } | null>(null)
  const [intelligenceEmpresa, setIntelligenceEmpresa] = useState<Empresa | null>(null)
  const [loadingPagina, setLoadingPagina] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalGateOpen, setTerminalGateOpen] = useState(false)
  const [perfilNome, setPerfilNome] = useState<string>('')
  const [scanData, setScanData] = useState<{
    result: BuscaResult
    params: BuscaParams
  } | null>(null)

  const paramsRef = useRef<BuscaParams | null>(null)

  const { enrich, enrichedMap, enrichingCnpjs } = useEnrichment()
  const { podeAcessar, nivel } = usePermissoes()

  // Carregar nome do usuário
  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    supabase.auth
      .getUser()
      .then(async ({ data: { user } }: { data: { user: unknown } }) => {
        if (!mounted || !user) return
        try {
          const res = await fetch('/api/perfil')
          if (!res.ok) return
          const data = await res.json()
          if (mounted) setPerfilNome(data?.perfil?.nome ?? '')
        } catch {
          // silencioso
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  // Atalho global: Cmd/Ctrl+K abre terminal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!podeAcessar('terminal')) return
        setTerminalGateOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [podeAcessar])

  const handleResultados = useCallback(
    (r: BuscaResult, p: BuscaParams) => {
      // Dispara scan overlay; a transição para "resultados" acontece ao
      // término da animação (handleScanComplete).
      paramsRef.current = p
      setSelected(null)
      enrich(r.empresas)
      setScanData({ result: r, params: p })
    },
    [enrich],
  )

  const handleScanComplete = useCallback(() => {
    if (!scanData) return
    setResultado(scanData.result)
    setParams(scanData.params)
    setActivePage('resultados')
    setScanData(null)
  }, [scanData])

  const handlePaginar = useCallback(
    async (pagina: number) => {
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
      if (p.cnpjs)
        payload.cnpjs = p.cnpjs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
      if (p.termosBusca)
        payload.termos_busca = p.termosBusca.split(',').map(t => ({ termo: t.trim(), tipo: p.termoBuscaEm ?? 'A' }))
      if (p.incluirCnaesSecundarios) payload.incluir_cnaes_secundarios = true
      if (p.somenteMatrizes) payload.somente_matrizes = true
      if (p.capitalSocialMinimo) payload.capital_social_minimo = p.capitalSocialMinimo
      if (p.capitalSocialMaximo) payload.capital_social_maximo = p.capitalSocialMaximo
      if (p.simplesNacional === 'apenas') payload.simples_nacional = true
      if (p.simplesNacional === 'excluir') payload.simples_nacional = false
      if (p.mei === 'apenas') payload.mei = true
      if (p.mei === 'excluir') payload.mei = false
      if (p.telefoneObrigatorio) payload.telefone_obrigatorio = true
      if (p.emailObrigatorio) payload.email_obrigatorio = true
      if (p.dataInicio) payload.data_inicio = p.dataInicio
      if (p.dataFim) payload.data_fim = p.dataFim

      try {
        const res = await fetch('/api/busca-cnae', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data: BuscaResult = await res.json()
        setResultado(data)
        enrich(data.empresas)
      } finally {
        setLoadingPagina(false)
      }
    },
    [enrich],
  )

  const handleAbrirFicha = useCallback((empresa: Empresa) => {
    setFichaTarget({ cnpj: empresa.cnpj, base: empresa })
    setActivePage('ficha')
  }, [])

  const handleAnalisarIA = useCallback((empresa: Empresa) => {
    setIntelligenceEmpresa(empresa)
    setActivePage('intelligence')
  }, [])

  const handleNavigate = useCallback(
    (page: AppPage) => {
      if (page === 'resultados' && !resultado) return
      setActivePage(page)
    },
    [resultado],
  )

  const handleOpenTerminal = useCallback(() => {
    if (!podeAcessar('terminal')) return
    setTerminalGateOpen(true)
  }, [podeAcessar])

  const inspectorOpen =
    (activePage === 'resultados' && !!selected) ||
    (activePage === 'intelligence' && !!intelligenceEmpresa)

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <TopBar
        userName={perfilNome}
        userLevel={nivel}
        totalEmpresas={resultado?.total}
        onLogout={onLogout}
      />

      <div className="flex-1 flex min-h-0">
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          hasResultados={!!resultado}
          podeAcessar={podeAcessar}
          isAdmin={nivel === 'admin'}
          onOpenTerminal={handleOpenTerminal}
        />

        <main className="flex-1 min-w-0 min-h-0 flex">
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            {activePage === 'busca' && <BuscaPage onResultados={handleResultados} />}

            {activePage === 'resultados' &&
              (resultado ? (
                <ResultadosPage
                  resultado={resultado}
                  buscaParams={params ?? undefined}
                  enrichedMap={enrichedMap}
                  enrichingCnpjs={enrichingCnpjs}
                  loadingPagina={loadingPagina}
                  selectedCnpj={selected?.cnpj ?? null}
                  onSelect={e => setSelected(e)}
                  onAbrirFicha={handleAbrirFicha}
                  onPaginar={handlePaginar}
                />
              ) : (
                <EmptyState
                  title="Nenhuma busca realizada"
                  description="Faça uma busca em Busca para ver resultados."
                  cta="Ir para busca"
                  onCta={() => setActivePage('busca')}
                />
              ))}

            {activePage === 'ficha' &&
              (fichaTarget ? (
                <FichaPage
                  cnpj={fichaTarget.cnpj}
                  empresaBase={fichaTarget.base}
                  onBack={() => setActivePage('resultados')}
                  onAnalisarIA={handleAnalisarIA}
                />
              ) : (
                <EmptyState
                  title="Nenhuma ficha aberta"
                  description="Selecione uma empresa nos resultados ou consulte um CNPJ."
                  cta="Ir para CNPJ"
                  onCta={() => setActivePage('cnpj')}
                />
              ))}

            {activePage === 'cnpj' && <CnpjPage />}

            {activePage === 'intelligence' && (
              <IntelligencePage empresaInicial={intelligenceEmpresa ?? undefined} />
            )}

            {activePage === 'admin' && nivel === 'admin' && <AdminPage />}

            {activePage === 'perfil' && <PerfilPage />}
          </div>

          <InspectorRail
            open={inspectorOpen}
            title={
              activePage === 'resultados'
                ? 'INSPECTOR · EMPRESA'
                : 'INSPECTOR · INTELLIGENCE CTX'
            }
            onClose={() => {
              if (activePage === 'resultados') setSelected(null)
              else setIntelligenceEmpresa(null)
            }}
          >
            {activePage === 'resultados' && selected && (
              <InspectorEmpresa
                empresa={enrichedMap?.get(selected.cnpj) ?? selected}
                onAbrirFicha={() => handleAbrirFicha(enrichedMap?.get(selected.cnpj) ?? selected)}
                onAnalisarIA={() => handleAnalisarIA(enrichedMap?.get(selected.cnpj) ?? selected)}
              />
            )}
            {activePage === 'intelligence' && intelligenceEmpresa && (
              <InspectorEmpresa empresa={intelligenceEmpresa} />
            )}
          </InspectorRail>
        </main>
      </div>

      <TerminalOverlay
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        onResultados={r => {
          setResultado(r)
          enrich(r.empresas)
          setActivePage('resultados')
          setTerminalOpen(false)
        }}
        onAbrirFicha={cnpj => {
          setFichaTarget({ cnpj })
          setActivePage('ficha')
          setTerminalOpen(false)
        }}
      />

      {terminalGateOpen && (
        <TerminalPasswordGate
          onConfirm={() => {
            setTerminalGateOpen(false)
            setTerminalOpen(true)
          }}
          onCancel={() => setTerminalGateOpen(false)}
        />
      )}

      {scanData && (
        <SearchScanOverlay
          ufs={scanData.params.ufs ?? []}
          cnaes={(scanData.params.cnae ?? '').split(',').map(c => c.trim()).filter(Boolean)}
          durationMs={5000}
          onComplete={handleScanComplete}
        />
      )}
    </div>
  )
}

function EmptyState({
  title,
  description,
  cta,
  onCta,
}: {
  title: string
  description: string
  cta?: string
  onCta?: () => void
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-10 animate-gtm-fade-in">
      <div className="size-12 rounded-[4px] border border-border bg-surface flex items-center justify-center text-muted text-[18px] font-mono">
        ∅
      </div>
      <div className="text-[14px] font-semibold text-primary">{title}</div>
      <div className="text-[12px] text-muted max-w-md">{description}</div>
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-2 h-9 px-4 rounded-[4px] bg-info text-background text-[12px] font-bold tracking-[0.04em] uppercase hover:bg-info/90 transition-colors"
        >
          {cta}
        </button>
      )}
    </div>
  )
}
