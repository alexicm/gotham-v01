'use client'

import { useEffect, useState } from 'react'
import { Building2, MapPin, Users, Briefcase, Download, RefreshCw, MessageCircle, Brain, ArrowLeft } from 'lucide-react'
import type { Empresa } from '@/types/empresa'
import { formatCNPJ, formatCapital, formatDate, exportCSV } from '@/lib/formatters'
import { getWhatsAppNumbers, setWhatsAppNumber } from '@/lib/whatsapp'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import { Panel, StatLabel, StatValue, Divider } from '@/components/ui-pal/Card'
import { Button } from '@/components/ui-pal/Button'
import { Badge, situacaoVariant } from '@/components/ui-pal/Badge'
import { Spinner } from '@/components/ui-pal/Spinner'

interface Props {
  cnpj: string
  empresaBase?: Empresa
  onBack?: () => void
  onAnalisarIA?: (e: Empresa) => void
}

export function FichaPage({ cnpj, empresaBase, onBack, onAnalisarIA }: Props) {
  const [empresa, setEmpresa] = useState<Empresa | null>(empresaBase ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isWa, setIsWa] = useState<boolean>(() => {
    const digits = cnpj.replace(/\D/g, '')
    return getWhatsAppNumbers()[digits] ?? false
  })
  const [showWaModal, setShowWaModal] = useState(false)

  async function fetchFicha() {
    setLoading(true)
    setError('')
    try {
      const digits = cnpj.replace(/\D/g, '')
      const res = await fetch(`/api/cnpj/${digits}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao buscar CNPJ.')
      } else {
        setEmpresa({
          ...data,
          telefone: data.telefone || empresaBase?.telefone,
          email: data.email || empresaBase?.email,
        })
      }
    } catch {
      setError('Falha na conexão com a API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (empresaBase?.enriquecida) {
      setEmpresa(empresaBase)
      return
    }
    fetchFicha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpj])

  function handleExport() {
    if (!empresa) return
    exportCSV(
      [
        {
          CNPJ: formatCNPJ(empresa.cnpj),
          'Razao Social': empresa.razaoSocial,
          'Nome Fantasia': empresa.nomeFantasia,
          CNAE: empresa.cnae,
          'Desc. CNAE': empresa.descricaoCnae,
          Logradouro: [empresa.logradouro, empresa.numero, empresa.complemento].filter(Boolean).join(', '),
          Bairro: empresa.bairro ?? '',
          Municipio: empresa.municipio,
          UF: empresa.uf,
          CEP: empresa.cep ?? '',
          Situacao: empresa.situacao,
          Porte: empresa.porte,
          'Capital Social': empresa.capitalSocial,
          'Data Inicio': empresa.dataInicio ?? '',
          'Natureza Juridica': empresa.naturezaJuridica ?? '',
          Email: empresa.email ?? '',
          Telefone: empresa.telefone ?? '',
        },
      ],
      `ficha_${cnpj.replace(/\D/g, '')}.csv`,
    )
  }

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 overflow-y-auto animate-gtm-fade-in">
      {/* Header */}
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Building2 size={11} />
            FICHA EMPRESA
          </span>
        }
        meta={
          <span className="flex items-center gap-1.5">
            {onBack && (
              <Button size="sm" variant="ghost" onClick={onBack}>
                <ArrowLeft size={11} /> Voltar
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={fetchFicha} disabled={loading}>
              <RefreshCw size={11} className={loading ? 'animate-gtm-spin' : ''} /> Atualizar
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={!empresa}>
              <Download size={11} /> CSV
            </Button>
            {onAnalisarIA && empresa && (
              <Button size="sm" variant="primary" onClick={() => onAnalisarIA(empresa)}>
                <Brain size={11} /> Analisar c/ IA
              </Button>
            )}
          </span>
        }
        className="flex-shrink-0"
      >
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-primary leading-tight truncate">
              {empresa?.nomeFantasia || empresa?.razaoSocial || formatCNPJ(cnpj)}
            </div>
            {empresa?.nomeFantasia && empresa.razaoSocial && (
              <div className="text-[12px] text-muted truncate">{empresa.razaoSocial}</div>
            )}
            <div className="text-[11px] font-mono tabular text-muted mt-1">
              {formatCNPJ(cnpj)}
            </div>
          </div>
          {empresa?.situacao && (
            <Badge variant={situacaoVariant(empresa.situacao)} className="text-[11px] px-2 py-1">
              {empresa.situacao}
            </Badge>
          )}
        </div>
      </Panel>

      {loading && !empresa && (
        <div className="flex-1 flex items-center justify-center text-muted text-[12px] gap-2">
          <Spinner /> Consultando BrasilAPI...
        </div>
      )}

      {error && (
        <div className="rounded-[4px] border border-critical/40 bg-critical/10 px-3 py-2 text-[12px] text-critical font-mono">
          ! {error}
        </div>
      )}

      {empresa && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0">
          <Panel title={<span className="flex items-center gap-2"><Building2 size={11} />DADOS GERAIS</span>}>
            <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Razão Social" value={empresa.razaoSocial} />
              <Field label="Nome Fantasia" value={empresa.nomeFantasia || '—'} />
              <Field label="CNPJ" value={formatCNPJ(empresa.cnpj)} mono />
              <Field
                label="CNAE Principal"
                value={
                  <span>
                    <span className="font-mono tabular">{empresa.cnae}</span> · {empresa.descricaoCnae}
                  </span>
                }
              />
              <Field label="Natureza Jurídica" value={empresa.naturezaJuridica || '—'} />
              <Field label="Porte" value={empresa.porte || '—'} />
              <Field label="Capital Social" value={formatCapital(empresa.capitalSocial)} mono />
              <Field label="Data de Abertura" value={formatDate(empresa.dataInicio)} mono />
              <Field label="Optante Simples" value={empresa.optanteSimples ? 'Sim' : 'Não'} />
              <Field label="Optante MEI" value={empresa.optanteMei ? 'Sim' : 'Não'} />
            </dl>
          </Panel>

          <Panel title={<span className="flex items-center gap-2"><MapPin size={11} />ENDEREÇO</span>}>
            <dl className="p-4 grid grid-cols-1 gap-3">
              <Field
                label="Logradouro"
                value={[empresa.logradouro, empresa.numero, empresa.complemento].filter(Boolean).join(', ') || '—'}
              />
              <Field label="Bairro" value={empresa.bairro || '—'} />
              <Field label="Município / UF" value={`${empresa.municipio} / ${empresa.uf}`} />
              <Field label="CEP" value={empresa.cep || '—'} mono />
            </dl>

            <Divider />

            <div className="p-4">
              <StatLabel>Contato</StatLabel>
              <div className="mt-2 grid grid-cols-1 gap-3">
                <Field label="E-mail" value={empresa.email || <span className="text-muted/50">—</span>} />
                <div>
                  <StatLabel>Telefone</StatLabel>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {empresa.telefone ? (
                      <>
                        <span className="text-[13px] font-mono tabular text-primary">{empresa.telefone}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const digits = cnpj.replace(/\D/g, '')
                            const next = !isWa
                            setIsWa(next)
                            setWhatsAppNumber(digits, next)
                          }}
                          title={isWa ? 'Remover marcação WhatsApp' : 'Marcar como WhatsApp'}
                          className={isWa ? 'text-success' : 'text-muted hover:text-primary transition-colors'}
                        >
                          <MessageCircle size={14} />
                        </button>
                        {isWa && (
                          <Button size="sm" variant="success" onClick={() => setShowWaModal(true)}>
                            <MessageCircle size={11} /> Enviar
                          </Button>
                        )}
                      </>
                    ) : (
                      <span className="text-muted/50 text-[13px]">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {empresa.cnaesSecundarios && empresa.cnaesSecundarios.length > 0 && (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Briefcase size={11} />
                  CNAEs SECUNDÁRIOS
                  <span className="text-info font-mono normal-case">
                    {empresa.cnaesSecundarios.length}
                  </span>
                </span>
              }
              className="xl:col-span-2"
            >
              <div className="p-4 max-h-[280px] overflow-y-auto divide-y divide-border/60">
                {empresa.cnaesSecundarios.map(c => (
                  <div key={c.codigo} className="flex gap-3 py-2 text-[12px]">
                    <span className="font-mono tabular text-muted min-w-[80px] flex-shrink-0">
                      {c.codigo}
                    </span>
                    <span className="text-primary">{c.descricao}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {empresa.socios && empresa.socios.length > 0 && (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Users size={11} />
                  QUADRO SOCIETÁRIO
                  <span className="text-info font-mono normal-case">
                    {empresa.socios.length}
                  </span>
                </span>
              }
              className="xl:col-span-2"
            >
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {empresa.socios.map((s, i) => (
                  <div key={i} className="rounded-[2px] border border-border bg-surface-2 p-3">
                    <div className="text-[13px] font-semibold text-primary mb-1.5">{s.nome_socio}</div>
                    <div className="text-[11px] text-muted flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        CPF/CNPJ:{' '}
                        <span className="font-mono tabular text-primary">{s.cnpj_cpf_do_socio}</span>
                      </span>
                      <span>
                        Entrada:{' '}
                        <span className="font-mono tabular text-primary">
                          {formatDate(s.data_entrada_sociedade)}
                        </span>
                      </span>
                      {s.qualificacao_socio && <span>{s.qualificacao_socio}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {showWaModal && empresa?.telefone && (
        <WhatsAppModal
          telefone={empresa.telefone}
          nomeEmpresa={empresa.nomeFantasia || empresa.razaoSocial}
          onClose={() => setShowWaModal(false)}
        />
      )}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <StatLabel>{label}</StatLabel>
      <StatValue mono={mono} className="mt-1 truncate">
        {value}
      </StatValue>
    </div>
  )
}
