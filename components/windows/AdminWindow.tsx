'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'

interface UsuarioResumido {
  id: string
  nome: string
  nivel: 'admin' | 'agente'
  ativo: boolean
}

export function AdminWindow() {
  const [usuarios, setUsuarios] = useState<UsuarioResumido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (signal?: AbortSignal) => {
    setCarregando(true)
    try {
      const res = await fetch('/api/admin/usuarios', { signal })
      if (signal?.aborted) return
      const data = await res.json()
      setUsuarios(data.usuarios ?? [])
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      console.error('[AdminWindow] Erro ao carregar:', e)
    } finally {
      if (!signal?.aborted) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    carregar(controller.signal)
    return () => controller.abort()
  }, [carregar])

  async function toggleAtivo(u: UsuarioResumido) {
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !u.ativo }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d.error ?? 'Erro ao alterar status')
        return
      }
      carregar()
    } catch {
      setErro('Erro de conexão ao alterar status')
    }
  }

  const cell: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 11,
    borderBottom: '1px solid #e0d8c4',
    fontFamily: "'Geist Mono', monospace",
    color: '#2c2416',
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f1e8', fontFamily: "'Geist Mono', monospace" }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0d8c4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#7a6a4a' }}>USUÁRIOS DO SISTEMA</span>
        <button
          onClick={() => window.open('/admin', '_blank')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', background: '#fbbf24', border: '1px solid #d97706',
            borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', color: '#1a1208',
          }}
        >
          <ExternalLink size={10} />
          Painel completo
        </button>
      </div>

      {erro && (
        <div style={{ padding: '6px 14px', fontSize: 10, color: '#dc2626', background: '#fee2e2', borderBottom: '1px solid #f87171' }}>
          {erro}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {carregando ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#7a6a4a', fontSize: 11 }}>Carregando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#ede8da' }}>
                {['Nome', 'Nível', 'Status', ''].map(h => (
                  <th key={h} style={{ ...cell, fontWeight: 700, textAlign: 'left', borderBottom: '1.5px solid #c8b888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                  <td style={cell}>{u.nome}</td>
                  <td style={cell}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                      background: u.nivel === 'admin' ? '#fef3c7' : '#f0fdf4',
                      color: u.nivel === 'admin' ? '#d97706' : '#16a34a',
                    }}>
                      {u.nivel.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...cell, color: u.ativo ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </td>
                  <td style={cell}>
                    <button
                      onClick={() => toggleAtivo(u)}
                      style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                        fontFamily: 'inherit', fontWeight: 600,
                        background: u.ativo ? '#fee2e2' : '#f0fdf4',
                        border: `1px solid ${u.ativo ? '#f87171' : '#86efac'}`,
                        color: u.ativo ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
