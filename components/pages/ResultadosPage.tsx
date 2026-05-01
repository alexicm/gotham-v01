'use client'

import { useState, useMemo } from 'react'
import { Download, ChevronUp, ChevronDown, Search, MessageCircle, FileText, ArrowLeft, ArrowRight } from 'lucide-react'
import type { Empresa, BuscaResult, BuscaParams } from '@/types/empresa'
import { formatCNPJ, formatCapital, exportCSV, exportJSON } from '@/lib/formatters'
import { getWhatsAppNumbers, setWhatsAppNumber } from '@/lib/whatsapp'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import { Panel } from '@/components/ui-pal/Card'
import { Input } from '@/components/ui-pal/Input'
import { Button } from '@/components/ui-pal/Button'
import { Badge, situacaoVariant } from '@/components/ui-pal/Badge'
import { Spinner } from '@/components/ui-pal/Spinner'
import { cn } from '@/lib/cn'

interface Props {
  resultado: BuscaResult
  buscaParams?: BuscaParams
  enrichedMap?: Map<string, Empresa>
  enrichingCnpjs?: Set<string>
  loadingPagina?: boolean
  selectedCnpj?: string | null
  onSelect?: (e: Empresa) => void
  onAbrirFicha: (e: Empresa) => void
  onPaginar?: (pagina: number) => void
}

type SortKey = 'razaoSocial' | 'municipio' | 'uf' | 'porte' | 'capitalSocial' | 'situacao' | 'telefone' | 'email'

const COLS: { k: SortKey; label: string; align?: 'left' | 'center' | 'right' }[] = [
  { k: 'razaoSocial', label: 'Empresa' },
  { k: 'municipio', label: 'Município' },
  { k: 'uf', label: 'UF', align: 'center' },
  { k: 'porte', label: 'Porte' },
  { k: 'capitalSocial', label: 'Capital', align: 'right' },
  { k: 'situacao', label: 'Situação' },
  { k: 'telefone', label: 'Telefone' },
  { k: 'email', label: 'E-mail' },
]

export function ResultadosPage({
  resultado,
  buscaParams,
  enrichedMap,
  enrichingCnpjs,
  loadingPagina,
  selectedCnpj,
  onSelect,
  onAbrirFicha,
  onPaginar,
}: Props) {
  const { empresas, total, pagina, ultimaPagina } = resultado
  const [filtro, setFiltro] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('razaoSocial')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [waNumbers, setWaNumbers] = useState<Record<string, boolean>>(() => getWhatsAppNumbers())
  const [waModal, setWaModal] = useState<{ telefone: string; nomeEmpresa: string } | null>(null)

  function toggleWa(cnpj: string, e: React.MouseEvent) {
    e.stopPropagation()
    const next = !waNumbers[cnpj]
    setWhatsAppNumber(cnpj, next)
    setWaNumbers(prev => ({ ...prev, [cnpj]: next }))
  }

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = filtro.toLowerCase()
    const filtroPortes = buscaParams?.filtroPortes ?? []
    const filtroSituacoes = buscaParams?.filtroSituacoes ?? []
    const filtroMunicipio = (buscaParams?.municipio ?? '').toLowerCase()
    const filtroUfs = buscaParams?.ufs ?? []

    return empresas.filter(e => {
      const enriched = enrichedMap?.get(e.cnpj)
      const situacao = (enriched?.situacao ?? e.situacao ?? '').toUpperCase()
      const porte = enriched?.porte ?? e.porte ?? ''
      const municipioEmpresa = (enriched?.municipio ?? e.municipio ?? '').toLowerCase()
      const ufEmpresa = (enriched?.uf ?? e.uf ?? '').toUpperCase()

      if (filtroPortes.length > 0 && !filtroPortes.some(p => porte.toUpperCase().includes(p))) return false
      if (filtroSituacoes.length > 0 && !filtroSituacoes.includes(situacao)) return false
      if (filtroMunicipio && !municipioEmpresa.includes(filtroMunicipio)) return false
      if (filtroUfs.length > 0 && !filtroUfs.includes(ufEmpresa)) return false

      return (
        !q ||
        e.razaoSocial.toLowerCase().includes(q) ||
        (e.nomeFantasia?.toLowerCase() ?? '').includes(q) ||
        e.cnpj.includes(q) ||
        municipioEmpresa.includes(q)
      )
    })
  }, [empresas, filtro, enrichedMap, enrichingCnpjs, buscaParams])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'pt-BR')
        : String(bv).localeCompare(String(av), 'pt-BR')
    })
  }, [filtered, sortKey, sortDir])

  function handleExportCSV() {
    const rows = sorted.map(e => ({
      CNPJ: formatCNPJ(e.cnpj),
      'Razao Social': e.razaoSocial,
      'Nome Fantasia': e.nomeFantasia,
      CNAE: e.cnae,
      'Desc. CNAE': e.descricaoCnae,
      Municipio: e.municipio,
      UF: e.uf,
      Situacao: e.situacao,
      Porte: e.porte,
      'Capital Social': e.capitalSocial,
      Email: e.email ?? '',
      Telefone: e.telefone ?? '',
    }))
    exportCSV(rows, `empresas_cnae_${Date.now()}.csv`)
  }
  function handleExportJSON() {
    exportJSON(sorted, `empresas_cnae_${Date.now()}.json`)
  }

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 animate-gtm-fade-in">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <FileText size={11} />
            RESULTADOS
            <span className="text-info font-mono tabular normal-case">
              {total.toLocaleString('pt-BR')}
            </span>
            <span className="text-muted/70">empresas</span>
          </span>
        }
        meta={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={handleExportCSV} title="Exportar CSV">
              <Download size={11} /> CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExportJSON} title="Exportar JSON">
              <Download size={11} /> JSON
            </Button>
          </div>
        }
        className="flex-1 min-h-0"
      >
        <div className="px-3 py-2 border-b border-border flex-shrink-0">
          <Input
            type="search"
            placeholder="Filtrar por nome, CNPJ ou município..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            leftIcon={<Search size={13} />}
          />
        </div>

        {buscaParams?.filtroSituacoes && buscaParams.filtroSituacoes.length > 0 && filtered.length < empresas.length && (
          <div className="mx-3 mt-2 rounded-[2px] border border-warning/30 bg-warning/10 px-3 py-1.5 text-[11px] text-warning font-mono">
            {empresas.length - filtered.length} empresa(s) ocultadas pelo filtro de situação.
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto">
          {loadingPagina ? (
            <div className="h-full flex items-center justify-center text-muted text-[12px] gap-2">
              <Spinner size={14} /> Carregando página {pagina}...
            </div>
          ) : sorted.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted text-[12px]">
              Nenhuma empresa encontrada com este filtro.
            </div>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="text-[10px] uppercase tracking-[0.08em] text-muted">
                  {COLS.map(({ k, label, align }) => (
                    <th
                      key={k}
                      onClick={() => handleSort(k)}
                      className={cn(
                        'px-3 h-8 font-semibold border-b border-border bg-surface select-none cursor-pointer hover:text-primary',
                        align === 'right' && 'text-right',
                        align === 'center' && 'text-center',
                        align !== 'right' && align !== 'center' && 'text-left',
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {sortKey === k ? (
                          sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                        ) : (
                          <span className="opacity-30"><ChevronUp size={11} /></span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 h-8 font-semibold border-b border-border bg-surface text-right">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(empresa => {
                  const enriched = enrichedMap?.get(empresa.cnpj)
                  const situacao = enriched?.situacao ?? empresa.situacao
                  const isLoading = enrichingCnpjs?.has(empresa.cnpj)
                  const selected = selectedCnpj === empresa.cnpj
                  return (
                    <tr
                      key={empresa.cnpj}
                      onClick={() => onSelect?.(enriched ?? empresa)}
                      className={cn(
                        'border-b border-border/60 transition-colors cursor-pointer',
                        selected
                          ? 'bg-info/8 hover:bg-info/12'
                          : 'hover:bg-surface-2/50',
                        isLoading && 'opacity-60',
                      )}
                    >
                      <td className="px-3 h-8 align-middle">
                        <div className="text-primary font-medium leading-tight truncate max-w-[280px]">
                          {empresa.nomeFantasia || empresa.razaoSocial}
                        </div>
                        <div className="text-[10px] font-mono tabular text-muted">
                          {formatCNPJ(empresa.cnpj)}
                        </div>
                      </td>
                      <td className="px-3 h-8 align-middle text-primary truncate max-w-[180px]">
                        {empresa.municipio}
                      </td>
                      <td className="px-3 h-8 align-middle text-center font-mono tabular text-primary">
                        {empresa.uf}
                      </td>
                      <td className="px-3 h-8 align-middle text-muted truncate max-w-[110px]">
                        {empresa.porte || '—'}
                      </td>
                      <td className="px-3 h-8 align-middle text-right font-mono tabular text-primary">
                        {formatCapital(empresa.capitalSocial)}
                      </td>
                      <td className="px-3 h-8 align-middle">
                        {isLoading ? (
                          <span className="text-muted text-[10px] font-mono">syncing…</span>
                        ) : (
                          <Badge variant={situacaoVariant(situacao)}>{situacao}</Badge>
                        )}
                      </td>
                      <td
                        className="px-3 h-8 align-middle font-mono tabular text-primary whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        {empresa.telefone ? (
                          <span className="inline-flex items-center gap-1.5">
                            {empresa.telefone}
                            <button
                              type="button"
                              onClick={e => toggleWa(empresa.cnpj, e)}
                              title={waNumbers[empresa.cnpj] ? 'Remover marca WhatsApp' : 'Marcar como WhatsApp'}
                              className={cn(
                                'transition-colors',
                                waNumbers[empresa.cnpj] ? 'text-success' : 'text-muted hover:text-primary',
                              )}
                            >
                              <MessageCircle size={11} />
                            </button>
                            {waNumbers[empresa.cnpj] && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  setWaModal({
                                    telefone: empresa.telefone!,
                                    nomeEmpresa: empresa.nomeFantasia || empresa.razaoSocial,
                                  })
                                }}
                                className="px-1.5 py-px rounded-[2px] bg-success/15 text-success border border-success/40 text-[10px] font-semibold hover:bg-success/25"
                              >
                                Enviar
                              </button>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted/50">—</span>
                        )}
                      </td>
                      <td className="px-3 h-8 align-middle text-muted truncate max-w-[160px]">
                        {empresa.email ?? <span className="text-muted/50">—</span>}
                      </td>
                      <td
                        className="px-3 h-8 align-middle text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onAbrirFicha(enriched ?? empresa)}
                        >
                          Ficha
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {ultimaPagina > 1 && (
          <div className="border-t border-border px-3 h-9 flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] text-muted font-mono tabular">
              Pág. <span className="text-primary">{pagina}</span> /{' '}
              <span className="text-primary">{ultimaPagina}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagina <= 1}
                onClick={() => onPaginar?.(pagina - 1)}
              >
                <ArrowLeft size={11} /> Anterior
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={pagina >= ultimaPagina}
                onClick={() => onPaginar?.(pagina + 1)}
              >
                Próxima <ArrowRight size={11} />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {waModal && (
        <WhatsAppModal
          telefone={waModal.telefone}
          nomeEmpresa={waModal.nomeEmpresa}
          onClose={() => setWaModal(null)}
        />
      )}
    </div>
  )
}
