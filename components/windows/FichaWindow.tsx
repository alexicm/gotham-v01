'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Users, Briefcase, Download, RefreshCw } from 'lucide-react'
import type { Empresa } from '@/types/empresa'
import { formatCNPJ, formatCapital, formatDate, situacaoColor, exportCSV } from '@/lib/formatters'

interface Props {
  cnpj: string
  empresaBase?: Empresa
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '1px solid #ddd0b0',
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#7a6a4a',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {title}
      </span>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '7px 0',
        borderBottom: '1px solid #f0e8d8',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 12, color: '#7a6a4a', flexShrink: 0, minWidth: 120 }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          color: '#2c2416',
          fontWeight: 500,
          textAlign: 'right',
          fontFamily: mono ? 'monospace' : 'inherit',
          wordBreak: 'break-word',
          maxWidth: '60%',
        }}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  background: '#ede8da',
  border: '1px solid #c8b888',
  borderRadius: 8,
  cursor: 'pointer',
  color: '#7a6a4a',
  touchAction: 'manipulation',
}

export function FichaWindow({ cnpj, empresaBase }: Props) {
  const [empresa, setEmpresa] = useState<Empresa | null>(empresaBase ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        setEmpresa(data)
      }
    } catch {
      setError('Falha na conexao com a API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
          'Optante Simples': empresa.optanteSimples ? 'Sim' : 'Nao',
          'Optante MEI': empresa.optanteMei ? 'Sim' : 'Nao',
        },
      ],
      `ficha_${cnpj.replace(/\D/g, '')}.csv`
    )
  }

  const sit = empresa?.situacao ?? ''

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8' }}>
      <style>{`@keyframes ficha-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header strip (shows inside desktop windows; mobile header is in MobileHeader) */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #ddd0b0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          flexWrap: 'wrap',
          rowGap: 8,
        }}
      >
        <Building2 size={16} color="#d97706" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#2c2416',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {empresa?.nomeFantasia || empresa?.razaoSocial || formatCNPJ(cnpj)}
          </div>
          <div style={{ fontSize: 11, color: '#a89868', fontFamily: 'monospace' }}>{formatCNPJ(cnpj)}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {sit && (
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 700,
                background: situacaoColor(sit) + '22',
                color: situacaoColor(sit),
                border: `1px solid ${situacaoColor(sit)}44`,
                whiteSpace: 'nowrap',
              }}
            >
              {sit}
            </span>
          )}
          <button onClick={fetchFicha} disabled={loading} style={iconBtn} aria-label="Atualizar">
            <RefreshCw
              size={14}
              style={{ animation: loading ? 'ficha-spin 0.7s linear infinite' : 'none' }}
            />
          </button>
          <button onClick={handleExport} disabled={!empresa} style={iconBtn} aria-label="Exportar CSV">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 24px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading && !empresa && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: '#7a6a4a',
              fontSize: 13,
              gap: 10,
            }}
          >
            <RefreshCw size={16} style={{ animation: 'ficha-spin 0.7s linear infinite' }} />
            Consultando BrasilAPI...
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              padding: '14px 18px',
              color: '#dc2626',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <strong>Erro:</strong> {error}
          </div>
        )}

        {empresa && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Dados Gerais */}
            <section>
              <SectionHeader icon={<Building2 size={14} color="#d97706" />} title="Dados Gerais" />
              <InfoRow label="Razao Social" value={empresa.razaoSocial} />
              <InfoRow label="Nome Fantasia" value={empresa.nomeFantasia} />
              <InfoRow label="CNPJ" value={formatCNPJ(empresa.cnpj)} mono />
              <InfoRow label="CNAE Principal" value={`${empresa.cnae} — ${empresa.descricaoCnae}`} />
              <InfoRow label="Natureza Juridica" value={empresa.naturezaJuridica} />
              <InfoRow label="Porte" value={empresa.porte} />
              <InfoRow label="Capital Social" value={formatCapital(empresa.capitalSocial)} mono />
              <InfoRow label="Data de Abertura" value={formatDate(empresa.dataInicio)} />
              <InfoRow label="Optante Simples" value={empresa.optanteSimples ? 'Sim' : 'Nao'} />
              <InfoRow label="Optante MEI" value={empresa.optanteMei ? 'Sim' : 'Nao'} />
            </section>

            {/* Endereco */}
            <section>
              <SectionHeader icon={<MapPin size={14} color="#d97706" />} title="Endereco" />
              <InfoRow
                label="Logradouro"
                value={[empresa.logradouro, empresa.numero, empresa.complemento].filter(Boolean).join(', ')}
              />
              <InfoRow label="Bairro" value={empresa.bairro} />
              <InfoRow label="Municipio / UF" value={`${empresa.municipio} / ${empresa.uf}`} />
              <InfoRow label="CEP" value={empresa.cep} mono />
            </section>

            {/* Contato */}
            <section>
              <SectionHeader icon={<Briefcase size={14} color="#d97706" />} title="Contato" />
              <InfoRow label="E-mail" value={empresa.email} />
              <InfoRow label="Telefone" value={empresa.telefone} />
            </section>

            {/* CNAEs Secundarios */}
            {empresa.cnaesSecundarios && empresa.cnaesSecundarios.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Briefcase size={14} color="#d97706" />}
                  title={`CNAEs Secundarios (${empresa.cnaesSecundarios.length})`}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {empresa.cnaesSecundarios.map(c => (
                    <div
                      key={c.codigo}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '6px 0',
                        borderBottom: '1px solid #f0e8d8',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: '#7a6a4a',
                          flexShrink: 0,
                          minWidth: 60,
                        }}
                      >
                        {c.codigo}
                      </span>
                      <span style={{ fontSize: 12, color: '#2c2416' }}>{c.descricao}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* QSA */}
            {empresa.socios && empresa.socios.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Users size={14} color="#d97706" />}
                  title={`Quadro Societario (${empresa.socios.length})`}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {empresa.socios.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#faf8f2',
                        border: '1px solid #e8e0cc',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#2c2416', marginBottom: 6 }}>
                        {s.nome_socio}
                      </div>
                      <div style={{ fontSize: 12, color: '#7a6a4a', marginBottom: 2 }}>
                        CPF/CNPJ:{' '}
                        <span style={{ fontFamily: 'monospace', color: '#2c2416' }}>
                          {s.cnpj_cpf_do_socio}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#7a6a4a' }}>
                        Entrada: {formatDate(s.data_entrada_sociedade)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
