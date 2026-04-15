// app/admin/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, UserPlus, X, Check, LogOut } from 'lucide-react'
import { MODULOS, MODULO_LABELS, MODULOS_PADRAO, type Modulo } from '@/lib/modulos'

interface Usuario {
  id: string
  nome: string
  cpf: string
  nivel: 'admin' | 'agente'
  modulos_permitidos: Modulo[]
  ativo: boolean
  criado_em: string
}

interface FormData {
  nome: string
  cpf: string
  codigo: string
  nivel: 'admin' | 'agente'
  modulosPermitidos: Modulo[]
}

const FORM_VAZIO: FormData = {
  nome: '',
  cpf: '',
  codigo: '',
  nivel: 'agente',
  modulosPermitidos: [...MODULOS_PADRAO['agente']],
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true)
    const res = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setUsuarios(data.usuarios ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => { carregarUsuarios() }, [carregarUsuarios])

  function abrirCriar() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(u: Usuario) {
    setEditando(u)
    setForm({
      nome: u.nome,
      cpf: u.cpf,
      codigo: '',
      nivel: u.nivel,
      modulosPermitidos: u.modulos_permitidos,
    })
    setErro('')
    setModalAberto(true)
  }

  function toggleModulo(modulo: Modulo) {
    setForm(prev => ({
      ...prev,
      modulosPermitidos: prev.modulosPermitidos.includes(modulo)
        ? prev.modulosPermitidos.filter(m => m !== modulo)
        : [...prev.modulosPermitidos, modulo],
    }))
  }

  function aoMudarNivel(nivel: 'admin' | 'agente') {
    setForm(prev => ({ ...prev, nivel, modulosPermitidos: [...MODULOS_PADRAO[nivel]] }))
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        const res = await fetch(`/api/admin/usuarios/${editando.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nivel: form.nivel, modulosPermitidos: form.modulosPermitidos }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      } else {
        const res = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      }
      setModalAberto(false)
      carregarUsuarios()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(u: Usuario) {
    await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !u.ativo }),
    })
    carregarUsuarios()
  }

  const cell: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #e0d8c4',
    fontSize: 12,
    color: '#2c2416',
    fontFamily: "'Geist Mono', monospace",
  }

  return (
    <div style={{ minHeight: '100vh', background: '#d4c4a8', fontFamily: "'Geist Mono', monospace", padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 36, height: 36, background: '#fbbf24', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={20} color="#1a1208" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2c2416' }}>Painel Admin</h1>
          <p style={{ margin: 0, fontSize: 11, color: '#7a6a4a' }}>Gerenciamento de usuários e acessos</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={abrirCriar}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#fbbf24', border: '1.5px solid #d97706',
              borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#1a1208', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <UserPlus size={14} />
            Novo usuário
          </button>
          <button
            onClick={() => window.close()}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', background: '#fee2e2', border: '1px solid #f87171',
              borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#dc2626', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <LogOut size={12} />
            Fechar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#f5f1e8', border: '1.5px solid #c8b888', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#ede8da' }}>
              {['Nome', 'CPF', 'Nível', 'Módulos', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ ...cell, fontWeight: 700, textAlign: 'left', borderBottom: '1.5px solid #c8b888' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={6} style={{ ...cell, textAlign: 'center', color: '#7a6a4a' }}>Carregando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} style={{ ...cell, textAlign: 'center', color: '#7a6a4a' }}>Nenhum usuário cadastrado</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                <td style={cell}>{u.nome}</td>
                <td style={cell}>{u.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                <td style={cell}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: u.nivel === 'admin' ? '#fef3c7' : '#f0fdf4',
                    color: u.nivel === 'admin' ? '#d97706' : '#16a34a',
                    border: `1px solid ${u.nivel === 'admin' ? '#fbbf24' : '#86efac'}`,
                  }}>
                    {u.nivel.toUpperCase()}
                  </span>
                </td>
                <td style={cell}>{u.modulos_permitidos.join(', ')}</td>
                <td style={cell}>
                  <span style={{ color: u.ativo ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={cell}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => abrirEditar(u)}
                      style={{ padding: '3px 10px', background: '#ede8da', border: '1px solid #c8b888', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                    >Editar</button>
                    <button
                      onClick={() => toggleAtivo(u)}
                      style={{
                        padding: '3px 10px', border: '1px solid', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                        background: u.ativo ? '#fee2e2' : '#f0fdf4',
                        borderColor: u.ativo ? '#f87171' : '#86efac',
                        color: u.ativo ? '#dc2626' : '#16a34a',
                      }}
                    >{u.ativo ? 'Desativar' : 'Ativar'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal criar/editar */}
      {modalAberto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: '#f5f1e8', border: '1.5px solid #c8b888', borderRadius: 12,
            padding: 28, width: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#2c2416' }}>
                {editando ? 'Editar usuário' : 'Novo usuário'}
              </h2>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#7a6a4a" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!editando && (
                <>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6a4a' }}>
                    NOME COMPLETO
                    <input
                      value={form.nome}
                      onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', background: '#ede8da', border: '1px solid #c8b888', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6a4a' }}>
                    CPF
                    <input
                      value={form.cpf}
                      onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', background: '#ede8da', border: '1px solid #c8b888', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6a4a' }}>
                    CÓDIGO DE ACESSO
                    <input
                      type="password"
                      value={form.codigo}
                      onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', background: '#ede8da', border: '1px solid #c8b888', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </label>
                </>
              )}

              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#7a6a4a' }}>NÍVEL</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['agente', 'admin'] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => aoMudarNivel(n)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: form.nivel === n ? '#fbbf24' : '#ede8da',
                        border: `1.5px solid ${form.nivel === n ? '#d97706' : '#c8b888'}`,
                        color: form.nivel === n ? '#1a1208' : '#7a6a4a',
                      }}
                    >
                      {n.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#7a6a4a' }}>MÓDULOS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {MODULOS.map(m => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#2c2416' }}>
                      <div
                        onClick={() => toggleModulo(m)}
                        style={{
                          width: 16, height: 16, borderRadius: 4, border: '1.5px solid #c8b888',
                          background: form.modulosPermitidos.includes(m) ? '#fbbf24' : '#ede8da',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        {form.modulosPermitidos.includes(m) && <Check size={10} color="#1a1208" />}
                      </div>
                      {MODULO_LABELS[m]}
                    </label>
                  ))}
                </div>
              </div>

              {erro && <p style={{ margin: 0, fontSize: 11, color: '#dc2626', background: '#fee2e2', padding: '8px 10px', borderRadius: 6 }}>{erro}</p>}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setModalAberto(false)}
                  style={{ flex: 1, padding: '10px 0', background: '#ede8da', border: '1px solid #c8b888', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#7a6a4a' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  style={{ flex: 1, padding: '10px 0', background: salvando ? '#e0d8c4' : '#fbbf24', border: '1.5px solid #d97706', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: '#1a1208' }}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
