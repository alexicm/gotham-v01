'use client'

import { useState } from 'react'
import { Search, X, Filter } from 'lucide-react'
import type { BuscaParams, BuscaResult } from '@/types/empresa'
import { Tabs } from '@/components/ui-pal/Tabs'
import { Chip } from '@/components/ui-pal/Chip'
import { Checkbox } from '@/components/ui-pal/Checkbox'
import { Input } from '@/components/ui-pal/Input'
import { Button } from '@/components/ui-pal/Button'
import { Panel } from '@/components/ui-pal/Card'
import { cn } from '@/lib/cn'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface Props {
  onResultados: (result: BuscaResult, params: BuscaParams) => void
}

type Aba = 'cnae' | 'empresa' | 'localiz' | 'periodo'

export function BuscaPage({ onResultados }: Props) {
  const [aba, setAba] = useState<Aba>('cnae')

  // CNAE & termos
  const [cnaeInput, setCnaeInput] = useState('')
  const [cnaes, setCnaes] = useState<string[]>([])
  const [cnpjs, setCnpjs] = useState('')
  const [termoInput, setTermoInput] = useState('')
  const [termos, setTermos] = useState<string[]>([])
  const [termoBuscaEm, setTermoBuscaEm] = useState<'R' | 'F' | 'A'>('A')
  const [incluirSecundarios, setIncluirSecundarios] = useState(false)
  const [somenteMatrizes, setSomenteMatrizes] = useState(false)

  // Empresa
  const [filtroPortes, setFiltroPortes] = useState<string[]>([])
  const [filtroSituacoes, setFiltroSituacoes] = useState<string[]>(['ATIVA'])
  const [capitalMin, setCapitalMin] = useState('')
  const [capitalMax, setCapitalMax] = useState('')
  const [simples, setSimples] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')
  const [mei, setMei] = useState<'ignorar' | 'apenas' | 'excluir'>('ignorar')

  // Localização
  const [ufs, setUfs] = useState<string[]>([])
  const [municipio, setMunicipio] = useState('')
  const [porPagina, setPorPagina] = useState(50)

  // Período/contato
  const [telefoneObrigatorio, setTelefoneObrigatorio] = useState(false)
  const [emailObrigatorio, setEmailObrigatorio] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    if (cnaes.length === 0) {
      setError('Informe ao menos um CNAE.')
      setAba('cnae')
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

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 animate-gtm-fade-in">
      <Panel
        title="QUERY BUILDER"
        meta={
          <span className="flex items-center gap-1.5">
            <Filter size={10} />
            CNAE · BrasilAPI
          </span>
        }
        className="flex-1 min-h-0"
      >
        <Tabs<Aba>
          value={aba}
          onChange={setAba}
          items={[
            { id: 'cnae', label: 'CNAE & Termos', badge: cnaes.length || undefined },
            {
              id: 'empresa',
              label: 'Empresa',
              badge: filtroPortes.length + filtroSituacoes.length || undefined,
            },
            { id: 'localiz', label: 'Localização', badge: ufs.length || undefined },
            { id: 'periodo', label: 'Contato & Período' },
          ]}
        />

        <form
          onSubmit={handleBuscar}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5 min-h-0">
            {aba === 'cnae' && (
              <>
                <Field
                  label="Código CNAE"
                  required
                  hint={
                    cnaes.length === 0
                      ? 'pressione Enter, vírgula ou espaço para adicionar'
                      : `${cnaes.length} selecionado${cnaes.length > 1 ? 's' : ''}`
                  }
                >
                  <ChipBox
                    invalid={cnaes.length === 0 && !!error}
                    chips={cnaes.map(c => (
                      <Chip
                        key={c}
                        variant="tag"
                        label={c}
                        onRemove={() => setCnaes(prev => prev.filter(x => x !== c))}
                      />
                    ))}
                  >
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
                      placeholder={cnaes.length === 0 ? 'Ex: 6201500' : '+ adicionar...'}
                      className="flex-1 min-w-[120px] bg-transparent text-[13px] text-primary placeholder:text-muted/60 outline-none font-mono tabular"
                      autoComplete="off"
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

                <Field
                  label="Termos na razão / fantasia"
                  hint={
                    termos.length > 0
                      ? `${termos.length} termo${termos.length > 1 ? 's' : ''}`
                      : 'opcional'
                  }
                  className="lg:col-span-2"
                >
                  <ChipBox
                    chips={termos.map(t => (
                      <Chip
                        key={t}
                        variant="tag"
                        label={t}
                        onRemove={() => setTermos(prev => prev.filter(x => x !== t))}
                      />
                    ))}
                  >
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
                      className="flex-1 min-w-[120px] bg-transparent text-[13px] text-primary placeholder:text-muted/60 outline-none"
                    />
                  </ChipBox>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted">
                      buscar em:
                    </span>
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

                <div className="flex flex-col gap-2.5 lg:col-span-2">
                  <Checkbox
                    checked={incluirSecundarios}
                    onChange={setIncluirSecundarios}
                    label="Incluir CNAEs secundários"
                  />
                  <Checkbox
                    checked={somenteMatrizes}
                    onChange={setSomenteMatrizes}
                    label="Somente matrizes (ignorar filiais)"
                  />
                </div>
              </>
            )}

            {aba === 'empresa' && (
              <>
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
                  <div className="flex items-center gap-2">
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
                      { v: 'apenas', l: 'Apenas' },
                      { v: 'excluir', l: 'Excluir' },
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
                      { v: 'apenas', l: 'Apenas' },
                      { v: 'excluir', l: 'Excluir' },
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
              </>
            )}

            {aba === 'localiz' && (
              <>
                <Field
                  label={
                    <span className="flex items-center gap-2">
                      Estados
                      {ufs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setUfs([])}
                          className="text-[10px] uppercase tracking-wider text-muted hover:text-info transition-colors normal-case"
                        >
                          [ Limpar ]
                        </button>
                      )}
                    </span>
                  }
                  hint={ufs.length > 0 ? `${ufs.length} selecionados` : 'todos os estados'}
                  className="lg:col-span-2"
                >
                  <div className="grid grid-cols-7 sm:grid-cols-9 gap-1">
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
                              ? 'border-info bg-info/15 text-info font-bold'
                              : 'border-border bg-surface-2 text-muted hover:text-primary hover:border-border-strong',
                          )}
                        >
                          {u}
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field label="Município" hint="filtro local">
                  <Input
                    type="text"
                    placeholder="Ex: São Paulo, Campinas..."
                    value={municipio}
                    onChange={e => setMunicipio(e.target.value)}
                    autoComplete="off"
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
              </>
            )}

            {aba === 'periodo' && (
              <>
                <Field label="Contato" className="lg:col-span-2">
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
                </Field>

                <Field label="Data de abertura — período" className="lg:col-span-2">
                  <div className="flex items-center gap-2">
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
                </Field>
              </>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mx-4 mb-3 rounded-[2px] border border-critical/40 bg-critical/10 px-3 py-2 text-[12px] text-critical font-mono"
            >
              ! {error}
            </div>
          )}

          <div className="border-t border-border p-3 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted font-mono">
              {cnaes.length > 0 ? (
                <>
                  <span className="text-primary">{cnaes.length}</span> CNAE ·{' '}
                  <span className="text-primary">{ufs.length || 'todos'}</span> UF ·{' '}
                  <span className="text-primary">{porPagina}</span> p/pág
                </>
              ) : (
                'aguardando query…'
              )}
            </div>
            <Button type="submit" variant="primary" size="lg" loading={loading}>
              <Search size={14} />
              {loading ? 'EXECUTANDO...' : 'EXECUTAR BUSCA'}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}

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

function ChipBox({
  chips,
  invalid,
  children,
}: {
  chips: React.ReactNode
  invalid?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5 items-center min-h-9 px-2 py-1.5 rounded-[4px] bg-background border focus-within:border-info focus-within:ring-1 focus-within:ring-info/40 transition-colors',
        invalid ? 'border-critical/60' : 'border-border',
      )}
    >
      {chips}
      {children}
    </div>
  )
}

// Re-export helper for X icon (used by Chip's onRemove visual)
export { X }
