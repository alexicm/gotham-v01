# Loading Screen + Módulo Admin + CNPJ Lookup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar tela de carregamento animada, módulo de gerenciamento de usuários com controle de acesso por módulo e nível, e janela dedicada de consulta de CNPJ.

**Architecture:** Loading Screen substitui o spinner atual em `app/page.tsx`. O módulo Admin expande a tabela `perfis` com `nivel` e `modulos_permitidos`, expõe rotas de API protegidas por service_role, e adiciona janela desktop + rota `/admin`. O hook `usePermissoes` centraliza o controle de acesso no frontend. O CNPJ Lookup é uma nova janela desktop que reutiliza a rota `/api/cnpj/[cnpj]` existente.

**Tech Stack:** Next.js 14 App Router, Supabase Auth + SSR, TypeScript, Lucide React, Geist Mono

---

## Mapa de arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `components/LoadingScreen.tsx` |
| Modificar | `app/page.tsx` |
| Criar | `supabase/migrations/004_admin.sql` |
| Criar | `lib/modulos.ts` |
| Criar | `hooks/usePermissoes.ts` |
| Criar | `app/api/admin/usuarios/route.ts` |
| Criar | `app/api/admin/usuarios/[id]/route.ts` |
| Modificar | `middleware.ts` |
| Criar | `app/admin/layout.tsx` |
| Criar | `app/admin/page.tsx` |
| Criar | `components/windows/AdminWindow.tsx` |
| Criar | `components/windows/CnpjWindow.tsx` |
| Modificar | `components/CnaeDesktop.tsx` |

---

## Task 1: LoadingScreen component

**Files:**
- Create: `components/LoadingScreen.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// components/LoadingScreen.tsx
export function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#d4c4a8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Geist Mono', monospace",
      zIndex: 99999,
    }}>
      <style>{`
        .gtm-triangle {
          stroke: #d97706;
          stroke-dasharray: 17;
          animation: gtm-dash 2.5s cubic-bezier(0.35, 0.04, 0.63, 0.95) infinite;
        }
        @keyframes gtm-dash {
          to { stroke-dashoffset: 136; }
        }
        .gtm-loading-text {
          font-family: 'Geist Mono', monospace;
          font-size: 5px;
          animation: gtm-blink 0.9s ease-in-out infinite;
          fill: #2c2416;
        }
        @keyframes gtm-blink {
          50% { opacity: 0; }
        }
      `}</style>

      <svg width="200" height="200" viewBox="0 0 40 60">
        <polygon
          className="gtm-triangle"
          fill="none"
          strokeWidth="1"
          points="16,1 32,32 1,32"
        />
        <text className="gtm-loading-text" x="0" y="45">
          Carregando...
        </text>
      </svg>

      <span style={{ fontSize: 10, color: '#8a7a5a', marginTop: -32, letterSpacing: '0.1em' }}>
        GOTHAM v0.1
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que não há erros de TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/LoadingScreen.tsx
git commit -m "feat: add animated loading screen component"
```

---

## Task 2: Integrar LoadingScreen no page.tsx

**Files:**
- Modify: `app/page.tsx`

O estado atual: `autenticado === null` exibe um spinner inline. Vamos substituir por `LoadingScreen` com timer de 3 segundos mínimo.

- [ ] **Step 1: Reescrever `app/page.tsx`**

```tsx
// app/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LoginScreen } from '@/components/LoginScreen'
import { LoadingScreen } from '@/components/LoadingScreen'
import { createClient } from '@/lib/supabase/client'

const CnaeDesktop = dynamic(
  () => import('@/components/CnaeDesktop').then(m => ({ default: m.CnaeDesktop })),
  { ssr: false }
)

export default function Home() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)
  const [timerDone, setTimerDone] = useState(false)

  // Timer mínimo de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => setTimerDone(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Verificação de sessão
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setAutenticado(!!user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = useCallback(() => setAutenticado(true), [])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAutenticado(false)
  }, [])

  // Mostrar loading enquanto timer não acabou OU sessão não foi verificada
  if (!timerDone || autenticado === null) {
    return <LoadingScreen />
  }

  return autenticado
    ? <CnaeDesktop onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Testar manualmente**
  - Abrir o browser e recarregar a página
  - Verificar que a tela de loading aparece por ~3 segundos
  - Verificar que o triângulo SVG está animado com cor âmbar
  - Verificar que após 3s aparece o desktop ou login normalmente

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace spinner with 3-second animated loading screen"
```

---

## Task 3: Constantes e tipos de módulos

**Files:**
- Create: `lib/modulos.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// lib/modulos.ts
export const MODULOS = ['busca', 'terminal', 'cnpj', 'admin'] as const
export type Modulo = typeof MODULOS[number]

// Módulos padrão por nível
export const MODULOS_PADRAO: Record<'admin' | 'agente', Modulo[]> = {
  admin: ['busca', 'terminal', 'cnpj', 'admin'],
  agente: ['busca', 'cnpj'],
}

// Labels para exibição
export const MODULO_LABELS: Record<Modulo, string> = {
  busca: 'Busca CNAE',
  terminal: 'Terminal',
  cnpj: 'CNPJ Lookup',
  admin: 'Painel Admin',
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/modulos.ts
git commit -m "feat: add modules constants and types"
```

---

## Task 4: Migração de banco 004_admin.sql

**Files:**
- Create: `supabase/migrations/004_admin.sql`

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- 004_admin.sql — Adiciona nível e módulos ao perfil de usuário

-- Remover políticas existentes de perfis para substituir por versões mais permissivas
DROP POLICY IF EXISTS "usuario_le_proprio_perfil" ON public.perfis;
DROP POLICY IF EXISTS "usuario_atualiza_proprio_perfil" ON public.perfis;

-- Adicionar colunas de controle de acesso
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'agente'
    CHECK (nivel IN ('admin', 'agente')),
  ADD COLUMN IF NOT EXISTS modulos_permitidos text[] NOT NULL
    DEFAULT ARRAY['busca', 'cnpj'];

-- SELECT: próprio perfil OU admin pode ver todos
CREATE POLICY "perfil_select"
  ON public.perfis FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.perfis p2
      WHERE p2.id = auth.uid() AND p2.nivel = 'admin'
    )
  );

-- UPDATE: próprio perfil OU admin pode atualizar todos
CREATE POLICY "perfil_update"
  ON public.perfis FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.perfis p2
      WHERE p2.id = auth.uid() AND p2.nivel = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.perfis p2
      WHERE p2.id = auth.uid() AND p2.nivel = 'admin'
    )
  );

-- Promover o usuário inicial a admin
-- Substitua pelo UUID real do usuário admin
-- Execute manualmente no Supabase Dashboard > SQL Editor:
-- UPDATE public.perfis SET nivel = 'admin', modulos_permitidos = ARRAY['busca','terminal','cnpj','admin'] WHERE id = '3bd40999-3534-4473-a3e6-2406cc4088d2';
```

- [ ] **Step 2: Aplicar a migração no Supabase Dashboard**

  1. Abrir https://supabase.com/dashboard → projeto `jpazzkivktidryeieblj`
  2. Ir em **SQL Editor**
  3. Colar e executar o conteúdo do arquivo (exceto o comentário do UPDATE)
  4. Depois executar separadamente:
  ```sql
  UPDATE public.perfis
  SET nivel = 'admin',
      modulos_permitidos = ARRAY['busca','terminal','cnpj','admin']
  WHERE id = '3bd40999-3534-4473-a3e6-2406cc4088d2';
  ```
  5. Verificar: `SELECT id, nivel, modulos_permitidos FROM perfis;` — deve mostrar o usuário com `nivel = 'admin'`

- [ ] **Step 3: Commit do arquivo de migração**

```bash
git add supabase/migrations/004_admin.sql
git commit -m "feat: add nivel and modulos_permitidos columns to perfis"
```

---

## Task 5: Hook usePermissoes

**Files:**
- Create: `hooks/usePermissoes.ts`

- [ ] **Step 1: Criar o hook**

```ts
// hooks/usePermissoes.ts
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Modulo } from '@/lib/modulos'

interface Permissoes {
  nivel: 'admin' | 'agente' | null
  modulosPermitidos: Modulo[]
  podeAcessar: (modulo: Modulo) => boolean
  carregando: boolean
}

export function usePermissoes(): Permissoes {
  const [nivel, setNivel] = useState<'admin' | 'agente' | null>(null)
  const [modulosPermitidos, setModulosPermitidos] = useState<Modulo[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCarregando(false); return }

      const { data: perfil } = await supabase
        .from('perfis')
        .select('nivel, modulos_permitidos')
        .eq('id', user.id)
        .single()

      if (perfil) {
        setNivel(perfil.nivel as 'admin' | 'agente')
        setModulosPermitidos(perfil.modulos_permitidos as Modulo[])
      }
      setCarregando(false)
    }

    carregar()
  }, [])

  function podeAcessar(modulo: Modulo): boolean {
    if (nivel === 'admin') return true
    return modulosPermitidos.includes(modulo)
  }

  return { nivel, modulosPermitidos, podeAcessar, carregando }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add hooks/usePermissoes.ts
git commit -m "feat: add usePermissoes hook for access control"
```

---

## Task 6: Rotas de API admin

**Files:**
- Create: `app/api/admin/usuarios/route.ts`
- Create: `app/api/admin/usuarios/[id]/route.ts`

- [ ] **Step 1: Criar `app/api/admin/usuarios/route.ts`**

```ts
// app/api/admin/usuarios/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

async function verificarAdmin() {
  const supabase = await createAdminClient()
  // Busca o usuário atual via cookie de sessão
  // O admin client tem service_role — usamos só para operações de dados
  // Para autenticação, criamos um client normal
  const { createClient } = await import('@/lib/supabase/server')
  const clientNormal = await createClient()
  const { data: { user } } = await clientNormal.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nivel')
    .eq('id', user.id)
    .single()

  if (perfil?.nivel !== 'admin') return null
  return user
}

// GET /api/admin/usuarios — lista todos os usuários
export async function GET() {
  const adminUser = await verificarAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const supabase = await createAdminClient()
  const { data: perfis, error } = await supabase
    .from('perfis')
    .select('id, nome, cpf, nivel, modulos_permitidos, ativo, criado_em')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ usuarios: perfis })
}

// POST /api/admin/usuarios — criar novo usuário
export async function POST(request: Request) {
  const adminUser = await verificarAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json()
  const { nome, cpf, codigo, nivel, modulosPermitidos } = body

  if (!nome || !cpf || !codigo || !nivel) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, cpf, codigo, nivel' }, { status: 400 })
  }

  const cpfDigits = cpf.replace(/\D/g, '')
  const email = `${cpfDigits}@gotham.app`

  const supabase = await createAdminClient()

  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: codigo,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Inserir perfil
  const { error: perfilError } = await supabase
    .from('perfis')
    .insert({
      id: authData.user.id,
      nome,
      cpf: cpfDigits,
      nivel,
      modulos_permitidos: modulosPermitidos ?? (nivel === 'admin'
        ? ['busca', 'terminal', 'cnpj', 'admin']
        : ['busca', 'cnpj']),
      ativo: true,
    })

  if (perfilError) {
    // Rollback: remover usuário do auth se perfil falhou
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: perfilError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: authData.user.id })
}
```

- [ ] **Step 2: Criar `app/api/admin/usuarios/[id]/route.ts`**

```ts
// app/api/admin/usuarios/[id]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

async function verificarAdmin() {
  const { createClient } = await import('@/lib/supabase/server')
  const clientNormal = await createClient()
  const { data: { user } } = await clientNormal.auth.getUser()
  if (!user) return null

  const supabase = await createAdminClient()
  const { data: perfil } = await supabase
    .from('perfis')
    .select('nivel')
    .eq('id', user.id)
    .single()

  if (perfil?.nivel !== 'admin') return null
  return user
}

// PATCH /api/admin/usuarios/[id] — atualizar nível, módulos ou status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await verificarAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.nivel !== undefined) updates.nivel = body.nivel
  if (body.modulosPermitidos !== undefined) updates.modulos_permitidos = body.modulosPermitidos
  if (body.ativo !== undefined) updates.ativo = body.ativo

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('perfis')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/usuarios/route.ts app/api/admin/usuarios/[id]/route.ts
git commit -m "feat: add admin API routes for user management"
```

---

## Task 7: Proteção da rota /admin no middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Atualizar `middleware.ts`**

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redireciona para / se API protegida e não autenticado
  const isProtectedApi = request.nextUrl.pathname.startsWith('/api/busca-cnae') ||
    request.nextUrl.pathname.startsWith('/api/cnpj')

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Protege a rota /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Verificar nível (usa anon key com sessão do usuário — RLS permite ler próprio perfil)
    const { data: perfil } = await supabase
      .from('perfis')
      .select('nivel')
      .eq('id', user.id)
      .single()

    if (perfil?.nivel !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protege as APIs de admin
  if (request.nextUrl.pathname.startsWith('/api/admin') && !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect /admin route and /api/admin in middleware"
```

---

## Task 8: Página /admin

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Criar `app/admin/layout.tsx`** (server component — verificação dupla de segurança)

```tsx
// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nivel')
    .eq('id', user.id)
    .single()

  if (perfil?.nivel !== 'admin') redirect('/')

  return <>{children}</>
}
```

- [ ] **Step 2: Criar `app/admin/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/admin/page.tsx
git commit -m "feat: add /admin page with user management UI"
```

---

## Task 9: AdminWindow (janela desktop simplificada)

**Files:**
- Create: `components/windows/AdminWindow.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// components/windows/AdminWindow.tsx
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

  const carregar = useCallback(async () => {
    setCarregando(true)
    const res = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setUsuarios(data.usuarios ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function toggleAtivo(u: UsuarioResumido) {
    await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !u.ativo }),
    })
    carregar()
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/windows/AdminWindow.tsx
git commit -m "feat: add AdminWindow desktop component"
```

---

## Task 10: CnpjWindow

**Files:**
- Create: `components/windows/CnpjWindow.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros. Se houver erro em `opcao_pelo_mei` não existir no tipo `EmpresaBrasilAPI`, ajustar para `(empresa as any).opcao_pelo_mei` ou adicionar o campo ao tipo em `types/empresa.ts`.

- [ ] **Step 3: Commit**

```bash
git add components/windows/CnpjWindow.tsx
git commit -m "feat: add CnpjWindow component for CNPJ lookup"
```

---

## Task 11: Integrar tudo no CnaeDesktop

**Files:**
- Modify: `components/CnaeDesktop.tsx`

- [ ] **Step 1: Adicionar imports no topo de `CnaeDesktop.tsx`**

Localizar o bloco de imports existente (linhas 1-14) e adicionar:

```tsx
import { ShieldCheck } from 'lucide-react'
import { AdminWindow } from './windows/AdminWindow'
import { CnpjWindow } from './windows/CnpjWindow'
import { usePermissoes } from '@/hooks/usePermissoes'
```

O import do `Search` de lucide-react já existe. Adicionar `ShieldCheck` à lista existente:
```tsx
import {
  Search, Terminal, FileText, Building2, Clock, BarChart2,
  X, Minus, Maximize2, GripVertical, LogOut, ShieldCheck
} from 'lucide-react'
```

- [ ] **Step 2: Adicionar `usePermissoes` na função `CnaeDesktopOS`**

Logo após `const { enrich, enrichedMap, enrichingCnpjs } = useEnrichment()`, adicionar:

```tsx
const { podeAcessar, nivel } = usePermissoes()
```

- [ ] **Step 3: Adicionar callback `openAdmin` e `openCnpj` — colocar após `openTerminal`**

```tsx
// ─ Open Admin ─
const openAdmin = useCallback(() => {
  upsertWindow('admin', {
    title: 'admin_panel.sys',
    icon: <ShieldCheck size={13} color="#d97706" />,
    width: 640,
    height: 480,
    content: <AdminWindow />,
  })
}, [upsertWindow])

// ─ Open CNPJ ─
const openCnpj = useCallback(() => {
  upsertWindow('cnpj', {
    title: 'cnpj_lookup.app',
    icon: <Search size={13} color="#d97706" />,
    width: 600,
    height: 580,
    content: <CnpjWindow />,
  })
}, [upsertWindow])
```

- [ ] **Step 4: Atualizar o menu bar — substituir o array de itens do menu**

Localizar o trecho do menu bar que contém o array `[{ label: 'Busca', ... }, { label: 'Terminal', ... }]` e substituir por:

```tsx
{[
  { label: 'Busca', fn: openBusca, icon: <Search size={11} />, modulo: 'busca' as const },
  { label: 'Terminal', fn: openTerminal, icon: <Terminal size={11} />, modulo: 'terminal' as const },
  { label: 'CNPJ', fn: openCnpj, icon: <Search size={11} />, modulo: 'cnpj' as const },
  ...(nivel === 'admin' ? [{ label: 'Admin', fn: openAdmin, icon: <ShieldCheck size={11} />, modulo: 'admin' as const }] : []),
].filter(item => podeAcessar(item.modulo)).map(item => (
  <button
    key={item.label}
    onClick={item.fn}
    style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 10px',
      background: 'transparent',
      border: 'none',
      borderRadius: 5,
      fontSize: 12,
      color: '#2c2416',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontWeight: 500,
    }}
    onMouseEnter={e => (e.currentTarget.style.background = '#e0d8c4')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    {item.icon}
    {item.label}
  </button>
))}
```

- [ ] **Step 5: Atualizar os ícones do desktop — substituir o bloco de `DesktopIcon`**

Localizar o bloco de Desktop Icons e substituir por:

```tsx
{/* ── Desktop Icons ─────────────────────────────────────────────────── */}
<div style={{ position: 'fixed', left: 16, top: 52, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1 }}>
  {podeAcessar('busca') && (
    <DesktopIcon label="nova_busca" icon={<Search size={20} color="#d97706" />} onClick={openBusca} />
  )}
  {podeAcessar('terminal') && (
    <DesktopIcon label="terminal" icon={<Terminal size={20} color="#4ade80" />} onClick={openTerminal} />
  )}
  {podeAcessar('cnpj') && (
    <DesktopIcon label="cnpj_lookup" icon={<Search size={20} color="#d97706" />} onClick={openCnpj} />
  )}
  {lastResult && podeAcessar('busca') && (
    <DesktopIcon
      label="resultados"
      icon={<FileText size={20} color="#d97706" />}
      onClick={() => openResultados(lastResult, lastParams ?? {})}
    />
  )}
  {nivel === 'admin' && (
    <DesktopIcon label="admin_panel" icon={<ShieldCheck size={20} color="#d97706" />} onClick={openAdmin} />
  )}
</div>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 7: Verificar build completo**

```bash
npm run build
```
Expected: Build compilado sem erros.

- [ ] **Step 8: Commit**

```bash
git add components/CnaeDesktop.tsx
git commit -m "feat: integrate admin and cnpj modules into desktop with access control"
```

---

## Verificação final

- [ ] Recarregar o sistema: loading screen de 3s aparece ✓
- [ ] Logar como admin: ícones de Admin e CNPJ aparecem no desktop ✓
- [ ] Abrir AdminWindow: lista de usuários aparece ✓
- [ ] Clicar "Painel completo": abre `/admin` em nova aba ✓
- [ ] Criar usuário Agente em `/admin`: novo usuário aparece na lista ✓
- [ ] Logar como Agente: ícone Admin não aparece, Terminal pode estar oculto conforme configuração ✓
- [ ] Abrir CnpjWindow: campo de busca aparece ✓
- [ ] Consultar CNPJ válido: dados exibidos em abas ✓
- [ ] Acessar `/admin` diretamente como Agente: redirecionado para `/` ✓
