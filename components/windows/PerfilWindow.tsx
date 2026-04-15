// components/windows/PerfilWindow.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Pixel box style (técnica do design de referência) ──────────────────────
const pixelBox: React.CSSProperties = {
  background: '#f5f1e8',
  boxShadow: [
    '0px 3px #e7e7e7',
    '0px -3px #d4c4a8',
    '3px 0px #d4c4a8',
    '-3px 0px #d4c4a8',
    '0px -6px #b6a695',
    '0px 6px #b6a695',
    '6px 0px #b6a695',
    '-6px 0px #b6a695',
    '9px 0px rgba(0,0,0,0.08)',
    '0px 9px rgba(0,0,0,0.08)',
  ].join(', '),
  padding: '12px 16px',
  position: 'relative',
  fontFamily: "'Geist Mono', monospace",
}

const pixelBoxAmbar: React.CSSProperties = {
  ...pixelBox,
  background: '#fbbf24',
  boxShadow: [
    '0px 3px #fdbc3d',
    '0px -3px #fbbf24',
    '3px 0px #fbbf24',
    '-3px 0px #fbbf24',
    '0px -6px #d97706',
    '0px 6px #d97706',
    '6px 0px #d97706',
    '-6px 0px #d97706',
    '9px 0px rgba(0,0,0,0.08)',
    '0px 9px rgba(0,0,0,0.08)',
  ].join(', '),
}

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── Component ──────────────────────────────────────────────────────────────
export function PerfilWindow() {
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
      // Cache-bust para forçar reload da imagem
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Salva foto_url e só atualiza estado se bem-sucedido
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#d4c4a8', fontFamily: "'Geist Mono', monospace", overflowY: 'auto' }}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Cabeçalho: avatar + nome + gênero ────────────────────────── */}
        <div style={{ ...pixelBox, display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Avatar */}
          <div
            onClick={() => !uploadando && fileInputRef.current?.click()}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#fbbf24',
              border: '3px solid #d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: uploadando ? 'wait' : 'pointer',
              overflow: 'hidden', flexShrink: 0,
              position: 'relative',
            }}
            title="Clique para alterar foto"
          >
            {fotoUrl ? (
              <img src={fotoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1208' }}>{iniciais}</span>
            )}
            {uploadando && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#fff' }}>...</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFotoUpload} />

          {/* Nome + Nível */}
          <div style={{ flex: 1 }}>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                display: 'block', width: '100%',
                padding: '8px 10px',
                background: '#ede8da', border: '1px solid #c8b888',
                borderRadius: 6, fontSize: 14, fontWeight: 700,
                fontFamily: 'inherit', color: '#2c2416',
                marginBottom: 8, boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: perfil?.nivel === 'admin' ? '#fef3c7' : '#f0fdf4',
              color: perfil?.nivel === 'admin' ? '#d97706' : '#16a34a',
              border: `1px solid ${perfil?.nivel === 'admin' ? '#fbbf24' : '#86efac'}`,
            }}>
              {(perfil?.nivel ?? 'agente').toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Seletor de gênero ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {(['m', 'f'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGenero(g)}
              style={{
                flex: 1, padding: '10px 0',
                ...(genero === g ? pixelBoxAmbar : pixelBox),
                cursor: 'pointer', border: 'none',
                fontSize: 12, fontWeight: 700,
                color: genero === g ? '#1a1208' : '#7a6a4a',
                textAlign: 'center',
              }}
            >
              {g === 'm' ? '♂  MASCULINO' : '♀  FEMININO'}
            </button>
          ))}
        </div>

        {/* ── Dados (somente leitura) ────────────────────────────────── */}
        <div style={{ ...pixelBox, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#7a6a4a' }}>MEUS DADOS</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: '#7a6a4a' }}>CPF</p>
              <p style={{ margin: 0, fontSize: 12, color: '#2c2416', fontWeight: 600 }}>{cpfFormatado}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: '#7a6a4a' }}>MÓDULOS</p>
              <p style={{ margin: 0, fontSize: 12, color: '#2c2416' }}>{perfil?.modulos_permitidos?.join(' · ') ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* ── Erros / Sucesso ───────────────────────────────────────── */}
        {erro && (
          <p style={{ margin: 0, padding: '8px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
            {erro}
          </p>
        )}
        {sucesso && (
          <p style={{ margin: 0, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: 11, color: '#16a34a' }}>
            ✓ Perfil salvo com sucesso.
          </p>
        )}

        {/* ── Botão Salvar ──────────────────────────────────────────── */}
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            ...pixelBoxAmbar,
            border: 'none', cursor: salvando ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, color: '#1a1208',
            opacity: salvando ? 0.7 : 1,
            alignSelf: 'flex-end',
            padding: '10px 28px',
          }}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>

        {/* ── Histórico de buscas ───────────────────────────────────── */}
        <div style={{ ...pixelBox, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: '#7a6a4a' }}>HISTÓRICO DE BUSCAS</p>
          {historico.length === 0 ? (
            <p style={{ margin: 0, fontSize: 11, color: '#a89868' }}>Nenhuma busca registrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {historico.map(h => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #e0d8c4',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: '#7a6a4a', marginRight: 12, flexShrink: 0 }}>
                    {new Date(h.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                  <span style={{ color: '#2c2416', flex: 1 }}>
                    CNAE {h.cnaes.slice(0, 3).join(', ')}{h.cnaes.length > 3 ? '...' : ''}
                  </span>
                  <span style={{ color: '#d97706', fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>
                    {h.total_resultados.toLocaleString('pt-BR')} emp.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
