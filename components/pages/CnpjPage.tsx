'use client'

import { useState } from 'react'
import { Search, Building2 } from 'lucide-react'
import { isValidCNPJ, formatCNPJ, formatCapital, formatDate } from '@/lib/formatters'
import type { EmpresaBrasilAPI } from '@/types/empresa'
import { Panel, StatLabel, StatValue, Divider } from '@/components/ui-pal/Card'
import { Input } from '@/components/ui-pal/Input'
import { Button } from '@/components/ui-pal/Button'
import { Badge, situacaoVariant } from '@/components/ui-pal/Badge'
import { Tabs } from '@/components/ui-pal/Tabs'
import { Spinner } from '@/components/ui-pal/Spinner'

type Aba = 'geral' | 'endereco' | 'contato' | 'socios' | 'cnaes'

export function CnpjPage() {
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [empresa, setEmpresa] = useState<EmpresaBrasilAPI | null>(null)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState<Aba>('geral')

  async function consultar() {
    const cnpjLimpo = input.replace(/\D/g, '')
    if (!isValidCNPJ(cnpjLimpo)) {
      setErro('CNPJ inválido. Verifique o número digitado.')
      return
    }
    setErro('')
    setCarregando(true)
    setEmpresa(null)
    try {
      const res = await fetch(`/api/cnpj/${cnpjLimpo}`)
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'CNPJ não encontrado')
      }
      const data: EmpresaBrasilAPI = await res.json()
      setEmpresa(data)
      setAba('geral')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao consultar CNPJ')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 overflow-y-auto animate-gtm-fade-in">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Building2 size={11} />
            CNPJ LOOKUP
          </span>
        }
        meta={<span className="text-muted/70 normal-case text-[10px]">via BrasilAPI</span>}
      >
        <div className="p-3 flex gap-2">
          <Input
            type="text"
            placeholder="00.000.000/0000-00"
            value={input}
            onChange={e => setInput(formatCNPJ(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && consultar()}
            maxLength={18}
            mono
            invalid={!!erro}
            containerClassName="flex-1"
          />
          <Button variant="primary" onClick={consultar} disabled={carregando}>
            {carregando ? <Spinner size={11} /> : <Search size={11} />}
            {carregando ? 'Consultando...' : 'Consultar'}
          </Button>
        </div>

        {erro && (
          <div className="mx-3 mb-3 rounded-[2px] border border-critical/40 bg-critical/10 px-3 py-1.5 text-[11px] text-critical font-mono">
            ! {erro}
          </div>
        )}
      </Panel>

      {!empresa && !carregando && !erro && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-muted">
          <Building2 size={36} className="text-muted/30" />
          <p className="text-[12px]">Digite um CNPJ para consultar</p>
        </div>
      )}

      {empresa && (
        <Panel className="flex-1 min-h-0">
          <div className="p-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-primary leading-tight truncate">
                {empresa.razao_social}
              </div>
              {empresa.nome_fantasia && (
                <div className="text-[12px] text-muted truncate">{empresa.nome_fantasia}</div>
              )}
              <div className="text-[11px] font-mono tabular text-muted mt-1">
                {formatCNPJ(empresa.cnpj)}
              </div>
            </div>
            <Badge variant={situacaoVariant(empresa.descricao_situacao_cadastral)}>
              {empresa.descricao_situacao_cadastral}
            </Badge>
          </div>

          <Tabs<Aba>
            value={aba}
            onChange={setAba}
            items={[
              { id: 'geral', label: 'Geral' },
              { id: 'endereco', label: 'Endereço' },
              { id: 'contato', label: 'Contato' },
              { id: 'socios', label: 'Sócios', badge: empresa.qsa?.length || undefined },
              {
                id: 'cnaes',
                label: 'CNAEs',
                badge: 1 + (empresa.cnaes_secundarios?.length ?? 0),
              },
            ]}
          />

          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {aba === 'geral' && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Field label="CNPJ" value={formatCNPJ(empresa.cnpj)} mono />
                <Field
                  label="CNAE Principal"
                  value={
                    <span>
                      <span className="font-mono tabular">{empresa.cnae_fiscal}</span> · {empresa.cnae_fiscal_descricao}
                    </span>
                  }
                />
                <Field label="Data de Abertura" value={formatDate(empresa.data_inicio_atividade)} mono />
                <Field label="Porte" value={empresa.porte || '—'} />
                <Field label="Capital Social" value={formatCapital(Number(empresa.capital_social))} mono />
                <Field label="Simples Nacional" value={empresa.opcao_pelo_simples ? 'Sim' : 'Não'} />
                <Field label="MEI" value={empresa.opcao_pelo_mei ? 'Sim' : 'Não'} />
                <Field label="Natureza Jurídica" value={empresa.natureza_juridica || '—'} />
              </dl>
            )}

            {aba === 'endereco' && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Field
                  label="Logradouro"
                  value={`${empresa.logradouro}, ${empresa.numero}${empresa.complemento ? ` — ${empresa.complemento}` : ''}`}
                />
                <Field label="Bairro" value={empresa.bairro || '—'} />
                <Field label="CEP" value={empresa.cep || '—'} mono />
                <Field label="Município / UF" value={`${empresa.municipio} / ${empresa.uf}`} />
              </dl>
            )}

            {aba === 'contato' && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Field label="E-mail" value={empresa.email || <span className="text-muted/50">—</span>} />
                <Field
                  label="Telefone"
                  value={empresa.telefone ? <span className="font-mono tabular">{empresa.telefone}</span> : <span className="text-muted/50">—</span>}
                />
              </dl>
            )}

            {aba === 'socios' &&
              (empresa.qsa?.length ? (
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.08em] text-muted">
                      <th className="text-left px-3 h-8 border-b border-border bg-surface">Nome</th>
                      <th className="text-left px-3 h-8 border-b border-border bg-surface">Qualificação</th>
                      <th className="text-left px-3 h-8 border-b border-border bg-surface">Entrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresa.qsa.map((s, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="px-3 h-8 text-primary">{s.nome_socio}</td>
                        <td className="px-3 h-8 text-muted">{s.qualificacao_socio}</td>
                        <td className="px-3 h-8 font-mono tabular text-muted">
                          {formatDate(s.data_entrada_sociedade)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted text-[12px]">Nenhum sócio registrado.</p>
              ))}

            {aba === 'cnaes' && (
              <div className="space-y-4">
                <div>
                  <StatLabel>CNAE Principal</StatLabel>
                  <div className="mt-2 rounded-[2px] border border-info/30 bg-info/8 px-3 py-2 text-[12px] text-primary">
                    <span className="font-mono tabular text-info">{empresa.cnae_fiscal}</span> ·{' '}
                    {empresa.cnae_fiscal_descricao}
                  </div>
                </div>
                {empresa.cnaes_secundarios?.length ? (
                  <div>
                    <StatLabel>
                      CNAEs Secundários ({empresa.cnaes_secundarios.length})
                    </StatLabel>
                    <Divider className="my-2" />
                    <div className="divide-y divide-border/60">
                      {empresa.cnaes_secundarios.map((c, i) => (
                        <div key={i} className="flex gap-3 py-2 text-[12px]">
                          <span className="font-mono tabular text-muted min-w-[80px] flex-shrink-0">
                            {c.codigo}
                          </span>
                          <span className="text-primary">{c.descricao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted text-[12px]">Nenhum CNAE secundário.</p>
                )}
              </div>
            )}
          </div>
        </Panel>
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
      <StatValue mono={mono} className="mt-0.5">{value}</StatValue>
    </div>
  )
}
