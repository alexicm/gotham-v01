'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { User, Camera, History, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Panel, StatLabel, StatValue, Divider } from '@/components/ui-pal/Card'
import { Button } from '@/components/ui-pal/Button'
import { Input } from '@/components/ui-pal/Input'
import { Badge } from '@/components/ui-pal/Badge'
import { cn } from '@/lib/cn'

interface PerfilData {
  id: string
  nome: string
  cpf: string
  nivel: 'admin' | 'agente'
  modulos_permitidos: string[]
  foto_url: string | null
  genero: 'm' | 'f' | null
}

interface HistoricoEntry {
  id: string
  cnaes: string[]
  total_resultados: number
  criado_em: string
}

export function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [historico, setHistorico] = useState<HistoricoEntry[]>([])
  const [nome, setNome] = useState('')
  const [genero, setGenero] = useState<'m' | 'f' | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregarPerfil = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/perfil', signal ? { signal } : undefined)
    if (signal?.aborted) return
    if (!res.ok) return
    const data = await res.json()
    const p: PerfilData = data.perfil
    setPerfil(p)
    setNome(p.nome ?? '')
    setGenero(p.genero ?? null)
    setFotoUrl(p.foto_url ?? null)
  }, [])

  const carregarHistorico = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/perfil/historico', signal ? { signal } : undefined)
    if (signal?.aborted) return
    if (!res.ok) return
    const data = await res.json()
    setHistorico(data.historico ?? [])
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    carregarPerfil(controller.signal)
    carregarHistorico(controller.signal)
    return () => controller.abort()
  }, [carregarPerfil, carregarHistorico])

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErro('Imagem muito grande. Máximo 2MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErro('Formato não suportado. Use JPG, PNG ou WebP.')
      return
    }

    setUploadando(true)
    setErro('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const saveRes = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_url: publicUrl }),
      })
      if (!saveRes.ok) {
        const d = await saveRes.json()
        throw new Error(d.error ?? 'Falha ao salvar URL da foto')
      }
      setFotoUrl(publicUrl)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao fazer upload')
    } finally {
      setUploadando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    setSucesso(false)
    try {
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, genero }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      setSucesso(true)
      setTimeout(() => setSucesso(false), 2500)
      carregarPerfil()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const iniciais = nome ? nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '?'
  const cpfFormatado = perfil?.cpf
    ? perfil.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : '—'

  return (
    <div className="h-full flex flex-col p-3 gap-3 min-h-0 overflow-y-auto animate-gtm-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel
          title={<span className="flex items-center gap-2"><User size={11} />PERFIL</span>}
          className="lg:col-span-2"
        >
          <div className="p-4 flex items-start gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => !uploadando && fileInputRef.current?.click()}
              className={cn(
                'relative size-20 rounded-[4px] bg-info/15 border border-info/40 overflow-hidden flex items-center justify-center flex-shrink-0',
                'hover:border-info transition-colors',
                uploadando ? 'cursor-wait' : 'cursor-pointer',
              )}
              title="Clique para alterar foto"
            >
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoUrl} alt="avatar" className="size-full object-cover" />
              ) : (
                <span className="text-[24px] font-bold text-info">{iniciais}</span>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-background/80 text-muted text-[9px] uppercase tracking-wider py-0.5 flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                <Camera size={9} /> upload
              </span>
              {uploadando && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-[10px] text-info font-mono">
                  ...
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFotoUpload}
            />

            <div className="flex-1 min-w-[200px] space-y-3">
              <div className="flex flex-col gap-1.5">
                <StatLabel>Nome</StatLabel>
                <Input value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={perfil?.nivel === 'admin' ? 'warning' : 'success'}>
                  {perfil?.nivel ?? 'agente'}
                </Badge>
                <span className="text-[10px] uppercase tracking-[0.1em] text-muted font-mono">
                  CPF{' '}
                  <span className="text-primary normal-case font-mono tabular tracking-normal">
                    {cpfFormatado}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <Divider />

          <div className="p-4 flex items-center gap-3 flex-wrap">
            <StatLabel>Gênero</StatLabel>
            <div className="flex gap-1.5">
              {(['m', 'f'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenero(g)}
                  className={cn(
                    'h-7 px-3 rounded-[2px] border text-[11px] uppercase tracking-wider transition-colors',
                    genero === g
                      ? 'border-info bg-info/15 text-info font-semibold'
                      : 'border-border bg-surface-2 text-muted hover:text-primary',
                  )}
                >
                  {g === 'm' ? '♂ Masculino' : '♀ Feminino'}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          <div className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted font-mono">
              módulos permitidos:{' '}
              <span className="text-primary normal-case font-sans tracking-normal">
                {perfil?.modulos_permitidos?.join(' · ') || '—'}
              </span>
            </div>
            <Button variant="primary" onClick={salvar} loading={salvando}>
              <Save size={11} /> Salvar
            </Button>
          </div>

          {erro && (
            <div className="mx-4 mb-4 rounded-[2px] border border-critical/40 bg-critical/10 px-3 py-1.5 text-[11px] text-critical font-mono">
              ! {erro}
            </div>
          )}
          {sucesso && (
            <div className="mx-4 mb-4 rounded-[2px] border border-success/40 bg-success/10 px-3 py-1.5 text-[11px] text-success font-mono">
              ✓ Perfil salvo com sucesso.
            </div>
          )}
        </Panel>

        <Panel
          title={<span className="flex items-center gap-2"><History size={11} />HISTÓRICO</span>}
          meta={<span className="font-mono">{historico.length}</span>}
        >
          <div className="p-3 max-h-[420px] overflow-y-auto">
            {historico.length === 0 ? (
              <p className="text-[12px] text-muted">Nenhuma busca registrada.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {historico.map(h => (
                  <li
                    key={h.id}
                    className="py-2 flex items-center justify-between gap-3 text-[11px]"
                  >
                    <span className="text-muted font-mono tabular flex-shrink-0">
                      {new Date(h.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-primary flex-1 truncate">
                      CNAE {h.cnaes.slice(0, 3).join(', ')}
                      {h.cnaes.length > 3 ? '…' : ''}
                    </span>
                    <span className="text-info font-mono tabular flex-shrink-0">
                      {h.total_resultados.toLocaleString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
