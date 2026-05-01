'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, Filter, ArrowLeft, ArrowRight, Check, SkipForward,
  Crosshair, MapPin, Briefcase, Building2, Calendar, Phone, Target, Rocket,
} from 'lucide-react'
import type { BuscaParams, BuscaResult } from '@/types/empresa'
import { Chip } from '@/components/ui-pal/Chip'
import { Checkbox } from '@/components/ui-pal/Checkbox'
import { Input } from '@/components/ui-pal/Input'
import { Button } from '@/components/ui-pal/Button'
import { Panel } from '@/components/ui-pal/Card'
import { cn } from '@/lib/cn'

const BrazilTacticalMap = dynamic(
  () => import('@/components/maps/BrazilTacticalMap').then(m => ({ default: m.BrazilTacticalMap })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[2px] border border-border bg-background flex items-center justify-center text-muted text-[11px] font-mono uppercase tracking-[0.18em] gap-2 h-[360px]">
        <span className="size-3 rounded-full border-2 border-info/40 border-t-info animate-gtm-spin" />
        carregando malha...
      </div>
    ),
  },
)

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface Props {
  onResultados: (result: BuscaResult, params: BuscaParams) => void
}

type StepId = 'cnae' | 'estados' | 'termos' | 'empresa' | 'periodo' | 'confirm'

interface StepDef {
  id: StepId
  label: string
  shortLabel: string
  icon: React.ReactNode
  variant: 'info' | 'success' | 'warning' | 'violet' | 'critical'
  optional: boolean
}

const STEPS: StepDef[] = [
  { id: 'cnae',    label: 'CNAE Alvo',          shortLabel: 'CNAE',    icon: <Target size={12} />,    variant: 'info',     optional: false },
  { id: 'estados', label: 'Estados',            shortLabel: 'UF',      icon: <MapPin size={12} />,    variant: 'success',  optional: true  },
  { id: 'termos',  label: 'Termos & Razão',     shortLabel: 'TERMOS',  icon: <Search size={12} />,    variant: 'info',     optional: true  },
  { id: 'empresa', label: 'Perfil da Empresa',  shortLabel: 'PERFIL',  icon: <Briefcase size={12} />, variant: 'warning',  optional: true  },
  { id: 'periodo', label: 'Contato & Período',  shortLabel: 'PERÍODO', icon: <Calendar size={12} />,  variant: 'violet',   optional: true  },
  { id: 'confirm', label: 'Confirmação & Disparo', shortLabel: 'EXEC', icon: <Rocket size={12} />,    variant: 'critical', optional: false },
]

export function BuscaPage({ onResultados }: Props) {
  const [stepIdx, setStepIdx] = useState(0)

  // CNAE
  const [cnaeInput, setCnaeInput] = useState('')
  const [cnaes, setCnaes] = useState<string[]>([])
  const [cnpjs, setCnpjs] = useState('')
  const [incluirSecundarios, setIncluirSecundarios] = useState(false)
  const [somenteMatrizes, setSomenteMatrizes] = useState(false)

  // Estados
  const [ufs, setUfs] = useState<string[]>([])
  const [municipio, setMunicipio] = useState('')

  // Termos
  const [termoInput, setTermoInput] = useState('')
  const [termos, setTermos] = useState<string[]>([])
  const [termoBuscaEm, setTermoBuscaEm] = useState<'R' | 'F' | 'A'>('A')

  // Perfil empresa
  const [filtroPortes, setFiltroPortes] = useState<string[]>([])
  const [filtroSituacoes, setFiltroSituacoes] = useState<string[]>(['ATIVA'])
  const [capitalMin, setCapitalMin] = useState('')
  const [capitalMax, setCapitalMax] = useState('')
  const [simples, setSimples] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')
  const [mei, setMei] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')

  // Período/contato
  const [telefoneObrigatorio, setTelefoneObrigatorio] = useState(false)
  const [emailObrigatorio, setEmailObrigatorio] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Quantidade
  const [porPagina, setPorPagina] = useState(50)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const step = STEPS[stepIdx]
  const totalSteps = STEPS.length
  const progress = ((stepIdx + 1) / totalSteps) * 100

  function togglePorte(p: string) {
    setFiltroPortes(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]))
  }
  function toggleSituacao(s: string) {
    setFiltroSituacoes(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]))
  }
  function toggleUf(u: string) {
    setUfs(prev => (prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]))
  }
  function adicionarTermo() {
    const t = termoInput.trim()
    if (t && !termos.includes(t)) setTermos(prev => [...prev, t])
    setTermoInput('')
  }
  function adicionarCnae() {
    const c = cnaeInput.trim().replace(/\D/g, '')
    if (c && !cnaes.includes(c)) setCnaes(prev => [...prev, c])
    setCnaeInput('')
  }

  function canAdvance(): boolean {
    if (step.id === 'cnae') return cnaes.length > 0
    return true
  }

  function next() {
    setError('')
    if (!canAdvance()) {
      setError('Informe ao menos um CNAE para continuar.')
      return
    }
    if (stepIdx < totalSteps - 1) setStepIdx(i => i + 1)
  }

  function prev() {
    setError('')
    if (stepIdx > 0) setStepIdx(i => i - 1)
  }

  function jumpTo(i: number) {
    if (i <= stepIdx || cnaes.length > 0) {
      setError('')
      setStepIdx(i)
    }
  }

  async function executar() {
    if (cnaes.length === 0) {
      setError('Informe ao menos um CNAE.')
      setStepIdx(0)
      return
    }
    setError('')
    setLoading(true)

    const cnaesNum = cnaes.map(c => parseInt(c, 10)).filter(Boolean)
    const payload: Record<string, unknown> = {
      cnaes: cnaesNum,
      inicio: 0,
      quantidade: porPagina,
    }
    if (cnpjs.trim()) {
      payload.cnpjs = cnpjs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    }
    if (termos.length > 0) {
      payload.termos_busca = termos.map(t => ({ termo: t, tipo: termoBuscaEm }))
    }
    if (incluirSecundarios) payload.incluir_cnaes_secundarios = true
    if (somenteMatrizes) payload.somente_matrizes = true
    if (ufs.length > 0) payload.estados = ufs
    if (capitalMin) payload.capital_social_minimo = Number(capitalMin)
    if (capitalMax) payload.capital_social_maximo = Number(capitalMax)
    if (simples === 'apenas') payload.simples_nacional = true
    if (simples === 'excluir') payload.simples_nacional = false
    if (mei === 'apenas') payload.mei = true
    if (mei === 'excluir') payload.mei = false
    if (telefoneObrigatorio) payload.telefone_obrigatorio = true
    if (emailObrigatorio) payload.email_obrigatorio = true
    if (dataInicio) payload.data_inicio = dataInicio
    if (dataFim) payload.data_fim = dataFim

    const params: BuscaParams = {
      cnae: cnaes.join(','),
      cnpjs: cnpjs.trim() || undefined,
      termosBusca: termos.join(',') || undefined,
      termoBuscaEm,
      incluirCnaesSecundarios: incluirSecundarios || undefined,
      somenteMatrizes: somenteMatrizes || undefined,
      simplesNacional: simples,
      mei,
      capitalSocialMinimo: capitalMin ? Number(capitalMin) : undefined,
      capitalSocialMaximo: capitalMax ? Number(capitalMax) : undefined,
      ufs: ufs.length > 0 ? ufs : undefined,
      municipio: municipio.trim() || undefined,
      porPagina,
      pagina: 1,
      telefoneObrigatorio: telefoneObrigatorio || undefined,
      emailObrigatorio: emailObrigatorio || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      filtroPortes: filtroPortes.length > 0 ? filtroPortes : undefined,
      filtroSituacoes: filtroSituacoes.length > 0 ? filtroSituacoes : undefined,
    }

    try {
      const res = await fetch('/api/busca-cnae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao buscar empresas.')
        return
      }
      onResultados(data, params)
    } catch {
      setError('Falha na conexão com a API.')
    } finally {
      setLoading(false)
    }
  }

  // Atalhos: Esc volta · Cmd/Ctrl+Enter executa no último step
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if (e.key === 'Escape' && stepIdx > 0) {
        e.preventDefault()
        prev()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && step.id === 'confirm' && !loading) {
        e.preventDefault()
        executar()
      }
      if (!isInput && e.key === 'ArrowRight' && step.id !== 'confirm') {
        e.preventDefault()
        next()
      }
      if (!isInput && e.key === 'ArrowLeft' && stepIdx > 0) {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, cnaes.length, loading])

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 animate-gtm-fade-in">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Filter size={11} />
            QUERY BUILDER · MISSION BRIEF
          </span>
        }
        meta={
          <span className="flex items-center gap-2 text-[10px] font-mono tabular">
            <span className="text-muted">STEP</span>
            <span className="text-info">{(stepIdx + 1).toString().padStart(2, '0')}</span>
            <span className="text-muted/50">/</span>
            <span className="text-muted">{totalSteps.toString().padStart(2, '0')}</span>
            <span className="text-muted/50">·</span>
            <span className={cn('font-semibold', VARIANT_TEXT[step.variant])}>
              {step.shortLabel}
            </span>
          </span>
        }
        className="flex-1 min-h-0"
      >
        {/* Stepper bar */}
        <Stepper
          stepIdx={stepIdx}
          steps={STEPS}
          values={{
            cnae: cnaes.length,
            estados: ufs.length,
            termos: termos.length,
            empresa: filtroPortes.length + filtroSituacoes.length + (capitalMin ? 1 : 0) + (capitalMax ? 1 : 0),
            periodo: (telefoneObrigatorio ? 1 : 0) + (emailObrigatorio ? 1 : 0) + (dataInicio ? 1 : 0) + (dataFim ? 1 : 0),
            confirm: 0,
          }}
          onJump={jumpTo}
          canJumpForward={cnaes.length > 0}
        />

        {/* Progress bar */}
        <div className="h-0.5 bg-surface-2 overflow-hidden">
          <div
            className={cn('h-full transition-[width] duration-200', VARIANT_BG[step.variant])}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step body */}
        <div key={step.id} className="flex-1 overflow-y-auto p-6 min-h-0 animate-gtm-fade-in">
          <PromptHeader step={step} stepIdx={stepIdx} totalSteps={totalSteps} />

          {step.id === 'cnae' && (
            <CnaeStep
              cnaes={cnaes}
              setCnaes={setCnaes}
              cnaeInput={cnaeInput}
              setCnaeInput={setCnaeInput}
              adicionarCnae={adicionarCnae}
              cnpjs={cnpjs}
              setCnpjs={setCnpjs}
              incluirSecundarios={incluirSecundarios}
              setIncluirSecundarios={setIncluirSecundarios}
              somenteMatrizes={somenteMatrizes}
              setSomenteMatrizes={setSomenteMatrizes}
              porPagina={porPagina}
              setPorPagina={setPorPagina}
            />
          )}

          {step.id === 'estados' && (
            <EstadosStep
              ufs={ufs}
              toggleUf={toggleUf}
              clearUfs={() => setUfs([])}
              municipio={municipio}
              setMunicipio={setMunicipio}
            />
          )}

          {step.id === 'termos' && (
            <TermosStep
              termos={termos}
              setTermos={setTermos}
              termoInput={termoInput}
              setTermoInput={setTermoInput}
              adicionarTermo={adicionarTermo}
              termoBuscaEm={termoBuscaEm}
              setTermoBuscaEm={setTermoBuscaEm}
            />
          )}

          {step.id === 'empresa' && (
            <EmpresaStep
              filtroPortes={filtroPortes}
              togglePorte={togglePorte}
              filtroSituacoes={filtroSituacoes}
              toggleSituacao={toggleSituacao}
              capitalMin={capitalMin}
              setCapitalMin={setCapitalMin}
              capitalMax={capitalMax}
              setCapitalMax={setCapitalMax}
              simples={simples}
              setSimples={setSimples}
              mei={mei}
              setMei={setMei}
            />
          )}

          {step.id === 'periodo' && (
            <PeriodoStep
              telefoneObrigatorio={telefoneObrigatorio}
              setTelefoneObrigatorio={setTelefoneObrigatorio}
              emailObrigatorio={emailObrigatorio}
              setEmailObrigatorio={setEmailObrigatorio}
              dataInicio={dataInicio}
              setDataInicio={setDataInicio}
              dataFim={dataFim}
              setDataFim={setDataFim}
            />
          )}

          {step.id === 'confirm' && (
            <ConfirmStep
              cnaes={cnaes}
              cnpjs={cnpjs}
              ufs={ufs}
              municipio={municipio}
              termos={termos}
              termoBuscaEm={termoBuscaEm}
              filtroPortes={filtroPortes}
              filtroSituacoes={filtroSituacoes}
              capitalMin={capitalMin}
              capitalMax={capitalMax}
              simples={simples}
              mei={mei}
              telefoneObrigatorio={telefoneObrigatorio}
              emailObrigatorio={emailObrigatorio}
              dataInicio={dataInicio}
              dataFim={dataFim}
              porPagina={porPagina}
              incluirSecundarios={incluirSecundarios}
              somenteMatrizes={somenteMatrizes}
              onEditStep={jumpTo}
            />
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mx-6 mb-3 rounded-[2px] border border-critical/40 bg-critical/10 px-3 py-2 text-[12px] text-critical font-mono"
          >
            ! {error}
          </div>
        )}

        {/* Footer / nav controls */}
        <div className="border-t border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={prev}
            disabled={stepIdx === 0}
          >
            <ArrowLeft size={11} /> VOLTAR
          </Button>

          {step.optional && step.id !== 'confirm' && (
            <Button variant="ghost" size="md" onClick={next}>
              <SkipForward size={11} /> PULAR
            </Button>
          )}

          <div className="flex-1 text-center text-[9px] font-mono uppercase tracking-[0.18em] text-muted/60 hidden md:block">
            {step.id === 'confirm'
              ? '⌘ + ENTER  PARA  EXECUTAR'
              : '← →  NAVEGAR  ·  ESC  VOLTAR'}
          </div>

          {step.id !== 'confirm' ? (
            <Button
              variant="primary"
              size="md"
              onClick={next}
              disabled={!canAdvance()}
            >
              PRÓXIMO <ArrowRight size={11} />
            </Button>
          ) : (
            <Button variant="primary" size="lg" loading={loading} onClick={executar}>
              <Rocket size={12} />
              {loading ? 'EXECUTANDO...' : 'DISPARAR BUSCA'}
            </Button>
          )}
        </div>
      </Panel>
    </div>
  )
}

// ─── Stepper bar ─────────────────────────────────────────────────────────────

function Stepper({
  stepIdx,
  steps,
  values,
  onJump,
  canJumpForward,
}: {
  stepIdx: number
  steps: StepDef[]
  values: Record<StepId, number>
  onJump: (i: number) => void
  canJumpForward: boolean
}) {
  return (
    <div className="px-3 py-2 border-b border-border bg-surface-2/40 flex items-center gap-1 overflow-x-auto">
      {steps.map((s, i) => {
        const active = i === stepIdx
        const done = i < stepIdx
        const reachable = i <= stepIdx || canJumpForward
        const count = values[s.id]
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => reachable && onJump(i)}
            disabled={!reachable}
            className={cn(
              'flex items-center gap-1.5 px-2 h-7 rounded-[2px] border text-[10px] font-mono uppercase tracking-[0.1em] transition-colors flex-shrink-0',
              active
                ? cn('font-semibold', VARIANT_BORDER[s.variant], VARIANT_BG_DIM[s.variant], VARIANT_TEXT[s.variant])
                : done
                  ? 'border-success/30 bg-success/5 text-success/70 hover:bg-success/10'
                  : reachable
                    ? 'border-border bg-surface text-muted hover:text-primary hover:border-border-strong'
                    : 'border-border/50 bg-surface/40 text-muted/40 cursor-not-allowed',
            )}
          >
            <span className="text-[9px] tabular text-muted/70">
              {(i + 1).toString().padStart(2, '0')}
            </span>
            <span className="opacity-80">{s.icon}</span>
            <span className="hidden sm:inline">{s.shortLabel}</span>
            {count > 0 && !active && (
              <span className="text-[9px] tabular bg-surface-3 text-primary px-1 rounded-[2px]">
                {count}
              </span>
            )}
            {done && active === false && <Check size={10} className="text-success" />}
          </button>
        )
      })}
    </div>
  )
}

// ─── Prompt header ───────────────────────────────────────────────────────────

function PromptHeader({
  step,
  stepIdx,
  totalSteps,
}: {
  step: StepDef
  stepIdx: number
  totalSteps: number
}) {
  const prompts: Record<StepId, { line: string; hint: string }> = {
    cnae: {
      line: 'Iniciando briefing operacional. Para começar, informe os códigos CNAE alvo.',
      hint: 'Pelo menos 1 CNAE é obrigatório. Múltiplos são suportados — pressione Enter, vírgula ou espaço para adicionar.',
    },
    estados: {
      line: 'Defina a área de operação.',
      hint: 'Clique nos estados no mapa ou nos botões. Vazio = todo território nacional.',
    },
    termos: {
      line: 'Filtre por termos na razão social ou nome fantasia.',
      hint: 'Opcional. Útil para refinar quando o CNAE retorna muitos resultados.',
    },
    empresa: {
      line: 'Aplique critérios de perfil sobre as empresas.',
      hint: 'Porte, situação cadastral, capital social e regime tributário.',
    },
    periodo: {
      line: 'Restringe por contato disponível ou data de abertura.',
      hint: 'Útil para campanhas com obrigatoriedade de telefone/e-mail.',
    },
    confirm: {
      line: 'Mission brief consolidado. Revise e dispare a operação.',
      hint: 'Clique em qualquer card abaixo para voltar ao step. ⌘+Enter para executar.',
    },
  }
  const p = prompts[step.id]
  return (
    <div className="mb-6 max-w-3xl">
      <div className={cn('flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] mb-2', VARIANT_TEXT[step.variant])}>
        <Crosshair size={11} />
        <span>STEP {(stepIdx + 1).toString().padStart(2, '0')} / {totalSteps.toString().padStart(2, '0')}</span>
        <span className="text-muted/50">·</span>
        <span>{step.label.toUpperCase()}</span>
        {step.optional && <span className="text-muted/60 normal-case">(opcional)</span>}
      </div>
      <div className="flex items-start gap-3">
        <span className={cn('font-mono text-[18px] leading-none mt-1', VARIANT_TEXT[step.variant])}>
          ▸
        </span>
        <div className="flex-1">
          <p className="text-[15px] text-primary leading-relaxed">{p.line}</p>
          <p className="text-[11px] text-muted mt-1.5 font-mono">{p.hint}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function CnaeStep({
  cnaes, setCnaes, cnaeInput, setCnaeInput, adicionarCnae,
  cnpjs, setCnpjs,
  incluirSecundarios, setIncluirSecundarios,
  somenteMatrizes, setSomenteMatrizes,
  porPagina, setPorPagina,
}: {
  cnaes: string[]
  setCnaes: React.Dispatch<React.SetStateAction<string[]>>
  cnaeInput: string
  setCnaeInput: (v: string) => void
  adicionarCnae: () => void
  cnpjs: string
  setCnpjs: (v: string) => void
  incluirSecundarios: boolean
  setIncluirSecundarios: (v: boolean) => void
  somenteMatrizes: boolean
  setSomenteMatrizes: (v: boolean) => void
  porPagina: number
  setPorPagina: (v: number) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5 max-w-4xl">
      <Field label="Códigos CNAE" required hint={`${cnaes.length || 0} adicionado(s)`} className="lg:col-span-2">
        <ChipBox>
          {cnaes.map(c => (
            <Chip
              key={c}
              variant="tag"
              label={c}
              onRemove={() => setCnaes(prev => prev.filter(x => x !== c))}
            />
          ))}
          <input
            value={cnaeInput}
            onChange={e => setCnaeInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                e.preventDefault()
                adicionarCnae()
              }
            }}
            onBlur={adicionarCnae}
            placeholder={cnaes.length === 0 ? 'Ex: 6201500 — pressione Enter' : '+ adicionar...'}
            className="flex-1 min-w-[160px] bg-transparent text-[14px] text-primary placeholder:text-muted/60 outline-none font-mono tabular py-1"
            autoComplete="off"
            autoFocus
          />
        </ChipBox>
      </Field>

      <Field label="CNPJs específicos" hint="opcional">
        <Input
          type="text"
          placeholder="Ex: 00.000.000/0001-91, 46729632000191"
          value={cnpjs}
          onChange={e => setCnpjs(e.target.value)}
          autoComplete="off"
          mono
        />
      </Field>

      <Field label="Registros por página">
        <div className="flex flex-wrap gap-1.5">
          {[10, 25, 50, 100].map(n => (
            <Chip
              key={n}
              label={String(n)}
              active={porPagina === n}
              onClick={() => setPorPagina(n)}
            />
          ))}
        </div>
      </Field>

      <div className="flex flex-col gap-2.5 lg:col-span-2 border-t border-border pt-4 mt-1">
        <Checkbox
          checked={incluirSecundarios}
          onChange={setIncluirSecundarios}
          label="Incluir CNAEs secundários no escopo"
        />
        <Checkbox
          checked={somenteMatrizes}
          onChange={setSomenteMatrizes}
          label="Somente matrizes (ignorar filiais)"
        />
      </div>
    </div>
  )
}

function EstadosStep({
  ufs, toggleUf, clearUfs,
  municipio, setMunicipio,
}: {
  ufs: string[]
  toggleUf: (u: string) => void
  clearUfs: () => void
  municipio: string
  setMunicipio: (v: string) => void
}) {
  return (
    <div className="space-y-4 max-w-5xl">
      <BrazilTacticalMap
        selected={ufs}
        onToggleUF={toggleUf}
        onClear={clearUfs}
        height={380}
      />

      <Field
        label={
          <span className="flex items-center gap-2">
            UFs selecionadas
            {ufs.length > 0 && (
              <button
                type="button"
                onClick={clearUfs}
                className="text-[10px] uppercase tracking-wider text-muted hover:text-info transition-colors normal-case"
              >
                [ Limpar ]
              </button>
            )}
          </span>
        }
        hint={ufs.length > 0 ? `${ufs.length} de 27` : 'todos os estados'}
      >
        <div className="grid grid-cols-7 sm:grid-cols-9 lg:grid-cols-14 gap-1">
          {UFS.map(u => {
            const active = ufs.includes(u)
            return (
              <button
                key={u}
                type="button"
                onClick={() => toggleUf(u)}
                className={cn(
                  'h-8 rounded-[2px] border text-[11px] font-mono tabular tracking-wider transition-colors',
                  active
                    ? 'border-success bg-success/15 text-success font-bold'
                    : 'border-border bg-surface-2 text-muted hover:text-primary hover:border-border-strong',
                )}
              >
                {u}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Município" hint="filtro local — aplicado após a busca">
        <Input
          type="text"
          placeholder="Ex: São Paulo, Campinas, Rio de Janeiro..."
          value={municipio}
          onChange={e => setMunicipio(e.target.value)}
          autoComplete="off"
        />
      </Field>
    </div>
  )
}

function TermosStep({
  termos, setTermos, termoInput, setTermoInput, adicionarTermo,
  termoBuscaEm, setTermoBuscaEm,
}: {
  termos: string[]
  setTermos: React.Dispatch<React.SetStateAction<string[]>>
  termoInput: string
  setTermoInput: (v: string) => void
  adicionarTermo: () => void
  termoBuscaEm: 'R' | 'F' | 'A'
  setTermoBuscaEm: (v: 'R' | 'F' | 'A') => void
}) {
  return (
    <div className="space-y-5 max-w-3xl">
      <Field label="Palavras-chave" hint={`${termos.length} termo(s)`}>
        <ChipBox>
          {termos.map(t => (
            <Chip
              key={t}
              variant="tag"
              label={t}
              onRemove={() => setTermos(prev => prev.filter(x => x !== t))}
            />
          ))}
          <input
            value={termoInput}
            onChange={e => setTermoInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                adicionarTermo()
              }
            }}
            placeholder={termos.length === 0 ? 'Digite e pressione Enter...' : '+ adicionar...'}
            className="flex-1 min-w-[160px] bg-transparent text-[14px] text-primary placeholder:text-muted/60 outline-none py-1"
            autoFocus
          />
        </ChipBox>
      </Field>

      <Field label="Buscar em">
        <div className="flex flex-wrap gap-1.5">
          {([
            { v: 'R', l: 'Razão Social' },
            { v: 'F', l: 'Fantasia' },
            { v: 'A', l: 'Ambos' },
          ] as const).map(o => (
            <Chip
              key={o.v}
              label={o.l}
              active={termoBuscaEm === o.v}
              onClick={() => setTermoBuscaEm(o.v)}
            />
          ))}
        </div>
      </Field>
    </div>
  )
}

function EmpresaStep({
  filtroPortes, togglePorte,
  filtroSituacoes, toggleSituacao,
  capitalMin, setCapitalMin,
  capitalMax, setCapitalMax,
  simples, setSimples,
  mei, setMei,
}: {
  filtroPortes: string[]
  togglePorte: (p: string) => void
  filtroSituacoes: string[]
  toggleSituacao: (s: string) => void
  capitalMin: string
  setCapitalMin: (v: string) => void
  capitalMax: string
  setCapitalMax: (v: string) => void
  simples: 'ignorar' | 'apenas' | 'excluir'
  setSimples: (v: 'ignorar' | 'apenas' | 'excluir') => void
  mei: 'ignorar' | 'apenas' | 'excluir'
  setMei: (v: 'ignorar' | 'apenas' | 'excluir') => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5 max-w-4xl">
      <Field label="Porte da empresa" hint="filtro local">
        <div className="flex flex-wrap gap-1.5">
          {[
            { v: 'ME', l: 'Micro (ME)' },
            { v: 'EPP', l: 'Peq. Porte (EPP)' },
            { v: 'DEMAIS', l: 'Demais' },
          ].map(o => (
            <Chip
              key={o.v}
              label={o.l}
              active={filtroPortes.includes(o.v)}
              onClick={() => togglePorte(o.v)}
            />
          ))}
        </div>
      </Field>

      <Field label="Situação cadastral" hint="filtro pós-enriquecimento">
        <div className="flex flex-wrap gap-1.5">
          {['ATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA', 'NULA'].map(s => (
            <Chip
              key={s}
              label={s}
              active={filtroSituacoes.includes(s)}
              onClick={() => toggleSituacao(s)}
            />
          ))}
        </div>
      </Field>

      <Field label="Capital social (R$)" className="lg:col-span-2">
        <div className="flex items-center gap-2 max-w-md">
          <Input
            type="number"
            min="0"
            placeholder="Mínimo"
            value={capitalMin}
            onChange={e => setCapitalMin(e.target.value)}
            mono
          />
          <span className="text-muted text-[12px] flex-shrink-0">—</span>
          <Input
            type="number"
            min="0"
            placeholder="Máximo"
            value={capitalMax}
            onChange={e => setCapitalMax(e.target.value)}
            mono
          />
        </div>
      </Field>

      <Field label="Simples Nacional">
        <div className="flex flex-wrap gap-1.5">
          {([
            { v: 'ignorar', l: 'Ignorar' },
            { v: 'apenas', l: 'Apenas Simples' },
            { v: 'excluir', l: 'Excluir Simples' },
          ] as const).map(o => (
            <Chip
              key={o.v}
              label={o.l}
              active={simples === o.v}
              onClick={() => setSimples(o.v)}
            />
          ))}
        </div>
      </Field>

      <Field label="MEI">
        <div className="flex flex-wrap gap-1.5">
          {([
            { v: 'ignorar', l: 'Ignorar' },
            { v: 'apenas', l: 'Apenas MEI' },
            { v: 'excluir', l: 'Excluir MEI' },
          ] as const).map(o => (
            <Chip
              key={o.v}
              label={o.l}
              active={mei === o.v}
              onClick={() => setMei(o.v)}
            />
          ))}
        </div>
      </Field>
    </div>
  )
}

function PeriodoStep({
  telefoneObrigatorio, setTelefoneObrigatorio,
  emailObrigatorio, setEmailObrigatorio,
  dataInicio, setDataInicio,
  dataFim, setDataFim,
}: {
  telefoneObrigatorio: boolean
  setTelefoneObrigatorio: (v: boolean) => void
  emailObrigatorio: boolean
  setEmailObrigatorio: (v: boolean) => void
  dataInicio: string
  setDataInicio: (v: string) => void
  dataFim: string
  setDataFim: (v: string) => void
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted font-semibold mb-2 flex items-center gap-2">
          <Phone size={11} className="text-violet" />
          Contato obrigatório
        </div>
        <div className="flex flex-col gap-2.5">
          <Checkbox
            checked={telefoneObrigatorio}
            onChange={setTelefoneObrigatorio}
            label="Somente empresas com telefone"
          />
          <Checkbox
            checked={emailObrigatorio}
            onChange={setEmailObrigatorio}
            label="Somente empresas com e-mail"
          />
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted font-semibold mb-2 flex items-center gap-2">
          <Calendar size={11} className="text-violet" />
          Janela de abertura
        </div>
        <div className="flex items-center gap-2 max-w-md">
          <Input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            mono
          />
          <span className="text-muted text-[12px] flex-shrink-0">—</span>
          <Input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            mono
          />
        </div>
      </div>
    </div>
  )
}

function ConfirmStep({
  cnaes, cnpjs, ufs, municipio, termos, termoBuscaEm,
  filtroPortes, filtroSituacoes, capitalMin, capitalMax, simples, mei,
  telefoneObrigatorio, emailObrigatorio, dataInicio, dataFim,
  porPagina, incluirSecundarios, somenteMatrizes,
  onEditStep,
}: {
  cnaes: string[]
  cnpjs: string
  ufs: string[]
  municipio: string
  termos: string[]
  termoBuscaEm: 'R' | 'F' | 'A'
  filtroPortes: string[]
  filtroSituacoes: string[]
  capitalMin: string
  capitalMax: string
  simples: string
  mei: string
  telefoneObrigatorio: boolean
  emailObrigatorio: boolean
  dataInicio: string
  dataFim: string
  porPagina: number
  incluirSecundarios: boolean
  somenteMatrizes: boolean
  onEditStep: (i: number) => void
}) {
  const briefRows: { stepIdx: number; label: string; value: React.ReactNode; variant: 'info' | 'success' | 'warning' | 'violet' }[] = [
    {
      stepIdx: 0,
      label: 'CNAE alvo',
      variant: 'info',
      value: cnaes.length === 0
        ? <span className="text-critical">— ausente —</span>
        : (
          <span className="flex flex-wrap gap-1">
            {cnaes.slice(0, 6).map(c => <Chip key={c} variant="tag" label={c} />)}
            {cnaes.length > 6 && <span className="text-muted text-[11px]">+{cnaes.length - 6}</span>}
          </span>
        ),
    },
    {
      stepIdx: 0,
      label: 'CNPJs específicos',
      variant: 'info',
      value: cnpjs.trim() ? <span className="font-mono text-[12px] truncate">{cnpjs}</span> : <span className="text-muted/50">—</span>,
    },
    {
      stepIdx: 1,
      label: 'Estados',
      variant: 'success',
      value: ufs.length === 0
        ? <span className="text-muted/70">todos os 27</span>
        : <span className="font-mono tabular text-[12px]">{ufs.join(' · ')}</span>,
    },
    {
      stepIdx: 1,
      label: 'Município',
      variant: 'success',
      value: municipio.trim() || <span className="text-muted/50">—</span>,
    },
    {
      stepIdx: 2,
      label: 'Termos',
      variant: 'info',
      value: termos.length === 0
        ? <span className="text-muted/50">—</span>
        : <span className="text-[12px]">{termos.join(', ')} <span className="text-muted/70">({{R:'razão',F:'fantasia',A:'ambos'}[termoBuscaEm]})</span></span>,
    },
    {
      stepIdx: 3,
      label: 'Porte / Situação',
      variant: 'warning',
      value: (filtroPortes.length === 0 && filtroSituacoes.length === 0)
        ? <span className="text-muted/50">—</span>
        : (
          <span className="text-[12px]">
            {filtroPortes.length > 0 ? `Porte: ${filtroPortes.join(',')}` : ''}
            {filtroPortes.length > 0 && filtroSituacoes.length > 0 ? ' · ' : ''}
            {filtroSituacoes.length > 0 ? `Sit: ${filtroSituacoes.join(',')}` : ''}
          </span>
        ),
    },
    {
      stepIdx: 3,
      label: 'Capital social',
      variant: 'warning',
      value: (capitalMin || capitalMax)
        ? <span className="font-mono text-[12px]">R$ {capitalMin || '0'} — R$ {capitalMax || '∞'}</span>
        : <span className="text-muted/50">—</span>,
    },
    {
      stepIdx: 3,
      label: 'Simples / MEI',
      variant: 'warning',
      value: <span className="text-[12px]">simples: <span className="text-primary">{simples}</span> · mei: <span className="text-primary">{mei}</span></span>,
    },
    {
      stepIdx: 4,
      label: 'Contato obrigatório',
      variant: 'violet',
      value: (telefoneObrigatorio || emailObrigatorio)
        ? <span className="flex gap-1.5">{telefoneObrigatorio && <Chip variant="tag" label="telefone" />}{emailObrigatorio && <Chip variant="tag" label="e-mail" />}</span>
        : <span className="text-muted/50">—</span>,
    },
    {
      stepIdx: 4,
      label: 'Janela de abertura',
      variant: 'violet',
      value: (dataInicio || dataFim)
        ? <span className="font-mono text-[12px]">{dataInicio || '—'} → {dataFim || '—'}</span>
        : <span className="text-muted/50">—</span>,
    },
  ]

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] mb-1">
        <span className="block w-8 h-px bg-critical/60" />
        <span className="text-critical font-semibold">CONFIRMAÇÃO DE BRIEFING</span>
        <span className="block w-8 h-px bg-critical/60" />
      </div>

      <div className="rounded-[2px] border border-border bg-surface divide-y divide-border/60">
        {briefRows.map((row, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onEditStep(row.stepIdx)}
            className="w-full px-3 py-2 flex items-start gap-3 text-left hover:bg-surface-2 transition-colors group"
          >
            <span className={cn('mt-1 size-1.5 rounded-full flex-shrink-0', VARIANT_BG[row.variant])} />
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3">
              <span className="text-[10px] uppercase tracking-[0.1em] text-muted font-semibold">
                {row.label}
              </span>
              <div className="text-primary text-[13px] truncate group-hover:text-primary">
                {row.value}
              </div>
            </div>
            <span className="opacity-0 group-hover:opacity-100 text-[9px] uppercase tracking-[0.1em] text-info font-mono flex-shrink-0 mt-1">
              EDITAR
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <Stat label="CNAEs"     value={cnaes.length} variant="info" />
        <Stat label="UFs"       value={ufs.length === 0 ? '27*' : ufs.length} variant="success" />
        <Stat label="Por pág."  value={porPagina} variant="warning" />
        <Stat label="Filtros"   value={
          (incluirSecundarios ? 1 : 0) + (somenteMatrizes ? 1 : 0) +
          filtroPortes.length + filtroSituacoes.length +
          (capitalMin ? 1 : 0) + (capitalMax ? 1 : 0) +
          (telefoneObrigatorio ? 1 : 0) + (emailObrigatorio ? 1 : 0) +
          (dataInicio ? 1 : 0) + (dataFim ? 1 : 0) +
          (simples !== 'ignorar' ? 1 : 0) + (mei !== 'ignorar' ? 1 : 0)
        } variant="violet" />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string
  value: React.ReactNode
  variant: 'info' | 'success' | 'warning' | 'violet'
}) {
  return (
    <div className={cn('rounded-[2px] border bg-surface px-3 py-2', VARIANT_BORDER[variant])}>
      <div className={cn('text-[9px] uppercase tracking-[0.12em] font-semibold', VARIANT_TEXT[variant])}>
        {label}
      </div>
      <div className="text-[18px] font-bold font-mono tabular text-primary mt-0.5">
        {value}
      </div>
    </div>
  )
}

// ─── Helpers de UI ──────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[10px] uppercase tracking-[0.12em] text-muted font-semibold">
          {label}
          {required && <span className="text-critical ml-1">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted/70 normal-case">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ChipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center min-h-10 px-2.5 py-2 rounded-[2px] bg-background border border-border focus-within:border-info focus-within:ring-1 focus-within:ring-info/40 transition-colors">
      {children}
    </div>
  )
}

// ─── Variant maps ───────────────────────────────────────────────────────────

const VARIANT_TEXT = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  violet: 'text-violet',
  critical: 'text-critical',
} as const

const VARIANT_BG = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  violet: 'bg-violet',
  critical: 'bg-critical',
} as const

const VARIANT_BG_DIM = {
  info: 'bg-info/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  violet: 'bg-violet/10',
  critical: 'bg-critical/10',
} as const

const VARIANT_BORDER = {
  info: 'border-info/40',
  success: 'border-success/40',
  warning: 'border-warning/40',
  violet: 'border-violet/40',
  critical: 'border-critical/40',
} as const
