// components/windows/CnpjWindow.tsx
'use client'

import { useState } from 'react'
import { Search, Building2 } from 'lucide-react'
import { isValidCNPJ, formatCNPJ, formatCapital, formatDate, situacaoColor } from '@/lib/formatters'
import type { EmpresaBrasilAPI } from '@/types/empresa'

type Aba = 'geral' | 'endereco' | 'contato' | 'socios' | 'cnaes'

const ABA_LABELS: Record<Aba, string> = {
  geral: 'Geral',
  endereco: 'Endereço',
  contato: 'Contato',
  socios: 'Sócios',
  cnaes: 'CNAEs',
}

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#7a6a4a', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12, color: '#2c2416' }}>{valor}</p>
    </div>
  )
}

export function CnpjWindow() {
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [empresa, setEmpresa] = useState<EmpresaBrasilAPI | null>(null)
  const [erro, setErro] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<Aba>('geral')

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
      setAbaAtiva('geral')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao consultar CNPJ')
    } finally {
      setCarregando(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') consultar()
  }

  const abas: Aba[] = ['geral', 'endereco', 'contato', 'socios', 'cnaes']

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8', fontFamily: "'Geist Mono', monospace" }}>
      {/* Campo de busca */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e0d8c4', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(formatCNPJ(e.target.value))}
          onKeyDown={onKeyDown}
          placeholder="00.000.000/0000-00"
          maxLength={18}
          style={{
            flex: 1, padding: '8px 10px', background: '#ede8da', border: '1px solid #c8b888',
            borderRadius: 6, fontSize: 13, fontFamily: 'inherit', color: '#2c2416',
            outline: 'none',
          }}
        />
        <button
          onClick={consultar}
          disabled={carregando}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: carregando ? '#e0d8c4' : '#fbbf24',
            border: '1.5px solid #d97706', borderRadius: 6, fontSize: 12, fontWeight: 700,
            cursor: carregando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: '#1a1208',
          }}
        >
          <Search size={13} />
          {carregando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ margin: '10px 14px 0', padding: '8px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
          {erro}
        </div>
      )}

      {/* Estado vazio */}
      {!empresa && !carregando && !erro && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#a89868' }}>
          <Building2 size={36} color="#c8b888" />
          <p style={{ margin: 0, fontSize: 12 }}>Digite um CNPJ para consultar</p>
        </div>
      )}

      {/* Resultado */}
      {empresa && (
        <>
          {/* Cabeçalho da empresa */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #e0d8c4' }}>
            <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#2c2416' }}>{empresa.razao_social}</p>
            {empresa.nome_fantasia && <p style={{ margin: '0 0 4px', fontSize: 11, color: '#7a6a4a' }}>{empresa.nome_fantasia}</p>}
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              color: situacaoColor(empresa.descricao_situacao_cadastral),
              background: `${situacaoColor(empresa.descricao_situacao_cadastral)}18`,
              border: `1px solid ${situacaoColor(empresa.descricao_situacao_cadastral)}40`,
            }}>
              {empresa.descricao_situacao_cadastral}
            </span>
          </div>

          {/* Abas */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e0d8c4', background: '#ede8da', flexShrink: 0 }}>
            {abas.map(aba => (
              <button
                key={aba}
                onClick={() => setAbaAtiva(aba)}
                style={{
                  padding: '8px 14px', background: abaAtiva === aba ? '#f5f1e8' : 'transparent',
                  border: 'none', borderBottom: abaAtiva === aba ? '2px solid #d97706' : '2px solid transparent',
                  fontSize: 11, fontWeight: abaAtiva === aba ? 700 : 500,
                  color: abaAtiva === aba ? '#d97706' : '#7a6a4a', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {ABA_LABELS[aba]}
              </button>
            ))}
          </div>

          {/* Conteúdo das abas */}
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
            {abaAtiva === 'geral' && (
              <>
                <Campo label="CNPJ" valor={formatCNPJ(empresa.cnpj)} />
                <Campo label="CNAE Principal" valor={`${empresa.cnae_fiscal} — ${empresa.cnae_fiscal_descricao}`} />
                <Campo label="Data de Abertura" valor={formatDate(empresa.data_inicio_atividade)} />
                <Campo label="Porte" valor={empresa.porte} />
                <Campo label="Capital Social" valor={formatCapital(Number(empresa.capital_social))} />
                <Campo label="Simples Nacional" valor={empresa.opcao_pelo_simples ? 'Sim' : 'Não'} />
                <Campo label="MEI" valor={empresa.opcao_pelo_mei ? 'Sim' : 'Não'} />
              </>
            )}

            {abaAtiva === 'endereco' && (
              <>
                <Campo label="Logradouro" valor={`${empresa.logradouro}, ${empresa.numero}${empresa.complemento ? ` — ${empresa.complemento}` : ''}`} />
                <Campo label="Bairro" valor={empresa.bairro} />
                <Campo label="CEP" valor={empresa.cep} />
                <Campo label="Município / UF" valor={`${empresa.municipio} / ${empresa.uf}`} />
              </>
            )}

            {abaAtiva === 'contato' && (
              <>
                <Campo label="E-mail" valor={empresa.email} />
                <Campo label="Telefone" valor={empresa.telefone} />
              </>
            )}

            {abaAtiva === 'socios' && (
              empresa.qsa?.length ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#ede8da' }}>
                      {['Nome', 'Qualificação', 'Entrada'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#7a6a4a', borderBottom: '1.5px solid #c8b888' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empresa.qsa.map((s, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e0d8c4', color: '#2c2416' }}>{s.nome_socio}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e0d8c4', color: '#7a6a4a' }}>{s.qualificacao_socio}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e0d8c4', color: '#7a6a4a' }}>{formatDate(s.data_entrada_sociedade)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#7a6a4a', fontSize: 12 }}>Nenhum sócio registrado</p>
              )
            )}

            {abaAtiva === 'cnaes' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#7a6a4a' }}>CNAE PRINCIPAL</p>
                  <div style={{ padding: '8px 10px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 6, fontSize: 11, color: '#2c2416' }}>
                    <strong>{empresa.cnae_fiscal}</strong> — {empresa.cnae_fiscal_descricao}
                  </div>
                </div>
                {empresa.cnaes_secundarios?.length ? (
                  <>
                    <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#7a6a4a' }}>CNAES SECUNDÁRIOS ({empresa.cnaes_secundarios.length})</p>
                    {empresa.cnaes_secundarios.map((c, i) => (
                      <div key={i} style={{ padding: '6px 10px', borderBottom: '1px solid #e0d8c4', fontSize: 11, color: '#2c2416' }}>
                        <strong>{c.codigo}</strong> — {c.descricao}
                      </div>
                    ))}
                  </>
                ) : (
                  <p style={{ color: '#7a6a4a', fontSize: 12 }}>Nenhum CNAE secundário</p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
