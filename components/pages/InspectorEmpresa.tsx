'use client'

import { Building2, Brain, ExternalLink } from 'lucide-react'
import type { Empresa } from '@/types/empresa'
import { formatCNPJ, formatCapital, formatDate } from '@/lib/formatters'
import { Badge, situacaoVariant } from '@/components/ui-pal/Badge'
import { Button } from '@/components/ui-pal/Button'
import { StatLabel, StatValue, Divider } from '@/components/ui-pal/Card'

export function InspectorEmpresa({
  empresa,
  onAbrirFicha,
  onAnalisarIA,
}: {
  empresa: Empresa
  onAbrirFicha?: () => void
  onAnalisarIA?: () => void
}) {
  return (
    <div className="flex flex-col p-4 gap-4 text-[12px]">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-[2px] bg-info/15 border border-info/30 flex items-center justify-center flex-shrink-0">
          <Building2 size={14} className="text-info" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-primary leading-tight truncate">
            {empresa.nomeFantasia || empresa.razaoSocial}
          </div>
          {empresa.nomeFantasia && (
            <div className="text-[11px] text-muted truncate">{empresa.razaoSocial}</div>
          )}
          <div className="text-[10px] font-mono tabular text-muted mt-1">
            {formatCNPJ(empresa.cnpj)}
          </div>
        </div>
      </div>

      {empresa.situacao && (
        <div>
          <Badge variant={situacaoVariant(empresa.situacao)}>{empresa.situacao}</Badge>
        </div>
      )}

      <Divider />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Stat label="UF" value={empresa.uf} mono />
        <Stat label="Município" value={empresa.municipio} />
        <Stat label="Porte" value={empresa.porte || '—'} />
        <Stat label="Capital" value={formatCapital(empresa.capitalSocial)} mono />
        {empresa.dataInicio && <Stat label="Abertura" value={formatDate(empresa.dataInicio)} mono />}
        {empresa.naturezaJuridica && <Stat label="Natureza" value={empresa.naturezaJuridica} />}
      </dl>

      <Divider />

      <div className="flex flex-col gap-2">
        <StatLabel>CNAE Principal</StatLabel>
        <div className="text-[12px] text-primary">
          <span className="font-mono tabular">{empresa.cnae}</span>
          <div className="text-muted text-[11px] mt-0.5">{empresa.descricaoCnae}</div>
        </div>
      </div>

      {(empresa.email || empresa.telefone) && (
        <>
          <Divider />
          <div className="grid grid-cols-1 gap-2.5">
            {empresa.telefone && <Stat label="Telefone" value={empresa.telefone} mono />}
            {empresa.email && <Stat label="E-mail" value={empresa.email} />}
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 mt-2">
        {onAbrirFicha && (
          <Button variant="primary" size="md" onClick={onAbrirFicha}>
            <ExternalLink size={11} /> Abrir ficha completa
          </Button>
        )}
        {onAnalisarIA && (
          <Button variant="secondary" size="md" onClick={onAnalisarIA}>
            <Brain size={11} /> Analisar com IA
          </Button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <StatLabel>{label}</StatLabel>
      <StatValue mono={mono} className="mt-0.5 truncate">{value}</StatValue>
    </div>
  )
}
