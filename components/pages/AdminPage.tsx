'use client'

import { useEffect, useState, useCallback } from 'react'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { Panel } from '@/components/ui-pal/Card'
import { Button } from '@/components/ui-pal/Button'
import { Badge } from '@/components/ui-pal/Badge'
import { Spinner } from '@/components/ui-pal/Spinner'

interface UsuarioResumido {
  id: string
  nome: string
  nivel: 'admin' | 'agente'
  ativo: boolean
}

export function AdminPage() {
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
      console.error('[AdminPage] Erro ao carregar:', e)
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

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 animate-gtm-fade-in">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck size={11} />
            ADMIN — USUÁRIOS DO SISTEMA
          </span>
        }
        meta={
          <Button size="sm" variant="primary" onClick={() => window.open('/admin', '_blank')}>
            <ExternalLink size={11} /> Painel completo
          </Button>
        }
        className="flex-1 min-h-0"
      >
        {erro && (
          <div className="mx-3 mt-3 rounded-[2px] border border-critical/40 bg-critical/10 px-3 py-1.5 text-[11px] text-critical font-mono">
            ! {erro}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto">
          {carregando ? (
            <div className="h-full flex items-center justify-center text-muted text-[12px] gap-2">
              <Spinner /> Carregando usuários...
            </div>
          ) : usuarios.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted text-[12px]">
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="text-left px-3 h-8 border-b border-border bg-surface">Nome</th>
                  <th className="text-left px-3 h-8 border-b border-border bg-surface">Nível</th>
                  <th className="text-left px-3 h-8 border-b border-border bg-surface">Status</th>
                  <th className="text-right px-3 h-8 border-b border-border bg-surface">Ação</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr
                    key={u.id}
                    className="border-b border-border/60 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-3 h-9 text-primary">{u.nome}</td>
                    <td className="px-3 h-9">
                      <Badge variant={u.nivel === 'admin' ? 'warning' : 'success'}>{u.nivel}</Badge>
                    </td>
                    <td className="px-3 h-9">
                      <Badge variant={u.ativo ? 'success' : 'critical'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-3 h-9 text-right">
                      <Button
                        size="sm"
                        variant={u.ativo ? 'danger' : 'success'}
                        onClick={() => toggleAtivo(u)}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  )
}
