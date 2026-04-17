# Gotham Search — Backend Supabase + UX Melhorias: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a autenticação hardcoded por Supabase Auth real, adicionar banco de dados com RLS para histórico de buscas e cache de empresas, proteger todas as rotas de API com sessão válida, e então implementar as melhorias de UX (BuscaWindow com abas, enriquecimento CNPJ progressivo, abertura de Ficha ao clicar na linha).

**Architecture:** Supabase SSR via `@supabase/ssr` com cookies HttpOnly para sessões persistentes. Middleware Next.js renova tokens automaticamente. Login usa CPF como `cpf@gotham.app` + código como senha no Supabase Auth. Todas as rotas de API validam sessão via `createServerClient`. Cache de CNPJ gravado via service role. O enriquecimento de empresas passa a checar o cache do Supabase antes de chamar BrasilAPI.

**Tech Stack:** Next.js 14 App Router, `@supabase/supabase-js@^2`, `@supabase/ssr@^0.5`, TypeScript, Supabase project `jpazzkivktidryeieblj`.

---

## File Map

### Phase 1 — Supabase Backend

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Create | `lib/supabase/client.ts` | Browser client (anon key, cookies) |
| Create | `lib/supabase/server.ts` | Server client (service role, cookies) |
| Create | `middleware.ts` | Renova sessão em toda requisição |
| Create | `supabase/migrations/001_schema.sql` | Tabelas: perfis, historico_buscas, cache_empresas, listas |
| Create | `supabase/migrations/002_rls.sql` | RLS policies |
| Create | `supabase/migrations/003_seed.sql` | Usuário inicial |
| Modify | `app/page.tsx` | Sessão Supabase substitui useState |
| Rewrite | `components/LoginScreen.tsx` | CPF+código → Supabase signInWithPassword |
| Create | `app/api/auth/logout/route.ts` | Sign out + limpar cookies |
| Modify | `app/api/busca-cnae/route.ts` | Validar sessão + gravar historico_buscas |
| Modify | `app/api/cnpj/[cnpj]/route.ts` | Checar cache_empresas antes de BrasilAPI |

### Phase 2 — UX Melhorias

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modify | `types/empresa.ts` | Expandir BuscaParams, adicionar enriquecida |
| Create | `hooks/useEnrichment.ts` | Batch enrichment com cache Supabase |
| Rewrite | `components/windows/BuscaWindow.tsx` | 4 abas + todos os filtros |
| Modify | `components/windows/ResultadosWindow.tsx` | onClick na linha, enrichment display |
| Modify | `components/windows/FichaWindow.tsx` | Pular fetch se já enriquecida |
| Modify | `components/CnaeDesktop.tsx` | Usar useEnrichment, paginação completa |
| Modify | `components/MobileLayout.tsx` | Mesma integração |

---

## PHASE 1 — SUPABASE BACKEND

---

## Task 1: Instalar dependências e configurar ambiente

**Files:**
- Modify: `package.json` (via npm)
- Already updated: `.env.development.local`

- [ ] **Step 1: Instalar pacotes Supabase**

```bash
cd /Users/alexrodriguesdossantos/Projetos/gotham-v01
npm install @supabase/supabase-js @supabase/ssr
```

Esperado: pacotes adicionados sem conflitos de peer dependencies.

- [ ] **Step 2: Verificar instalação**

```bash
node -e "require('@supabase/ssr'); console.log('OK')"
```

Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js and @supabase/ssr"
```

---

## Task 2: Criar clientes Supabase (`lib/supabase/`)

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Criar `lib/supabase/client.ts` (browser)**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Criar `lib/supabase/server.ts` (server — usa cookies do Next.js)**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente anon — para leitura com RLS (usa sessão do usuário)
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* ignorar em Server Components */ }
        },
      },
    }
  )
}

// Cliente service_role — bypassa RLS, apenas em rotas de API server-side
export async function createAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* ignorar em Server Components */ }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 3: Criar middleware Next.js para renovação de sessão

**Files:**
- Create: `middleware.ts` (raiz do projeto)

O middleware roda em cada requisição e renova o token de acesso automaticamente antes que expire.

- [ ] **Step 1: Criar `middleware.ts`**

```typescript
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

  // Renova sessão — não redireciona, apenas atualiza cookies
  const { data: { user } } = await supabase.auth.getUser()

  // Redireciona para / se rota protegida e não autenticado
  const isProtectedApi = request.nextUrl.pathname.startsWith('/api/busca-cnae') ||
    request.nextUrl.pathname.startsWith('/api/cnpj')

  if (isProtectedApi && !user) {
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

- [ ] **Step 2: Verificar que o servidor inicia sem erro**

```bash
npm run dev &
sleep 4
curl -s http://localhost:3000/api/busca-cnae -X POST -H "Content-Type: application/json" \
  -d '{"cnaes":[8630504],"inicio":0,"quantidade":1}' | head -c 100
kill %1
```

Esperado: resposta `{"error":"Não autenticado"}` (401) — o middleware está funcionando.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Next.js middleware for Supabase session refresh and route protection"
```

---

## Task 4: Schema do banco de dados Supabase

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`
- Create: `supabase/migrations/003_seed.sql`

Estas migrations devem ser executadas no Supabase SQL Editor em https://supabase.com/dashboard/project/jpazzkivktidryeieblj/sql

- [ ] **Step 1: Criar `supabase/migrations/001_schema.sql`**

```sql
-- 001_schema.sql
-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Perfis de usuário ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perfis (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  cpf         TEXT NOT NULL UNIQUE,
  nome        TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Histórico de buscas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.historico_buscas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cnaes           TEXT[] NOT NULL,
  params          JSONB NOT NULL DEFAULT '{}',
  total_resultados INTEGER,
  creditos_usados  INTEGER,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historico_usuario ON public.historico_buscas (usuario_id, criado_em DESC);

-- ─── Cache de empresas enriquecidas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cache_empresas (
  cnpj            TEXT PRIMARY KEY,                    -- 14 dígitos sem formatação
  dados           JSONB NOT NULL,                      -- objeto Empresa completo
  fonte           TEXT NOT NULL DEFAULT 'brasilapi',
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_cache_expira ON public.cache_empresas (expira_em);

-- ─── Listas salvas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listas (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  cnpjs         TEXT[] NOT NULL DEFAULT '{}',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER perfis_updated_at
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER listas_updated_at
  BEFORE UPDATE ON public.listas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Step 2: Criar `supabase/migrations/002_rls.sql`**

```sql
-- 002_rls.sql — Row Level Security

-- ─── perfis ──────────────────────────────────────────────────────────────────
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_le_proprio_perfil"
  ON public.perfis FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "usuario_atualiza_proprio_perfil"
  ON public.perfis FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── historico_buscas ────────────────────────────────────────────────────────
ALTER TABLE public.historico_buscas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_le_proprio_historico"
  ON public.historico_buscas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "usuario_insere_historico"
  ON public.historico_buscas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuario_deleta_proprio_historico"
  ON public.historico_buscas FOR DELETE
  USING (auth.uid() = usuario_id);

-- ─── cache_empresas ──────────────────────────────────────────────────────────
ALTER TABLE public.cache_empresas ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode LER o cache (dados públicos da Receita Federal)
CREATE POLICY "autenticado_le_cache"
  ON public.cache_empresas FOR SELECT
  USING (auth.role() = 'authenticated');

-- SOMENTE service_role pode ESCREVER no cache (sem política = apenas service_role)

-- ─── listas ──────────────────────────────────────────────────────────────────
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_gerencia_proprias_listas"
  ON public.listas FOR ALL
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);
```

- [ ] **Step 3: Criar `supabase/migrations/003_seed.sql`**

```sql
-- 003_seed.sql
-- Cria o usuário inicial no Supabase Auth
-- CPF: 04119480160 → email: 04119480160@gotham.app
-- Código: 258510 → senha: 258510
-- ATENÇÃO: executar apenas uma vez. Verificar se já existe antes.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Cria usuário no auth.users via função do Supabase
  -- (Na prática, usar a API de Admin ou o dashboard para criar o primeiro usuário)
  -- Este seed é documentação do processo — execute via Supabase Dashboard:
  -- Auth → Users → Invite User
  -- Email: 04119480160@gotham.app
  -- Password: 258510

  -- Após criar via dashboard, inserir o perfil:
  -- INSERT INTO public.perfis (id, cpf, nome)
  -- VALUES ('<uuid_do_usuario>', '04119480160', 'Administrador');
  RAISE NOTICE 'Crie o usuário via Supabase Dashboard: Auth > Users > Add user';
  RAISE NOTICE 'Email: 04119480160@gotham.app | Senha: 258510';
  RAISE NOTICE 'Depois insira o perfil com o UUID gerado.';
END $$;
```

- [ ] **Step 4: Executar migrations no Supabase Dashboard**

Acesse https://supabase.com/dashboard/project/jpazzkivktidryeieblj/sql e execute os arquivos em ordem:
1. `supabase/migrations/001_schema.sql` — criar tabelas
2. `supabase/migrations/002_rls.sql` — criar RLS policies

Verificar no Supabase: Table Editor → as 4 tabelas devem aparecer.

- [ ] **Step 5: Criar usuário inicial no Supabase Dashboard**

Acesse: Authentication → Users → Add user (manual)
- Email: `04119480160@gotham.app`
- Password: `258510`
- Copie o UUID gerado

Execute no SQL Editor:
```sql
INSERT INTO public.perfis (id, cpf, nome)
VALUES ('<UUID_COPIADO>', '04119480160', 'Administrador');
```

- [ ] **Step 6: Commit das migrations**

```bash
git add supabase/
git commit -m "feat: add Supabase schema, RLS policies and seed instructions"
```

---

## Task 5: Atualizar autenticação (LoginScreen + page.tsx + logout)

**Files:**
- Rewrite: `components/LoginScreen.tsx`
- Modify: `app/page.tsx`
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Reescrever `components/LoginScreen.tsx`**

```tsx
// components/LoginScreen.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { BarChart2, Eye, EyeOff, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

interface Props {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: Props) {
  const [cpf, setCpf] = useState('')
  const [codigo, setCodigo] = useState('')
  const [showCodigo, setShowCodigo] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const cpfRef = useRef<HTMLInputElement>(null)
  const codigoRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cpfRef.current?.focus() }, [])

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
    if (erro) setErro('')
    if (formatted.replace(/\D/g, '').length === 11) {
      setTimeout(() => codigoRef.current?.focus(), 50)
    }
  }

  function handleCodigoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setCodigo(val)
    if (erro) setErro('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cpfRaw = cpf.replace(/\D/g, '')

    if (cpfRaw.length !== 11) {
      setErro('CPF inválido. Digite os 11 dígitos.')
      triggerShake()
      return
    }
    if (!codigo.trim()) {
      setErro('Informe o código de acesso.')
      triggerShake()
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: `${cpfRaw}@gotham.app`,
      password: codigo.trim(),
    })

    setLoading(false)

    if (error) {
      setErro('CPF ou código incorretos. Tente novamente.')
      triggerShake()
      return
    }

    onLogin()
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  // ─ Styles (idênticos ao original) ─
  return (
    <div style={styles.overlay}>
      <div style={styles.bgDots} />
      <div style={{ ...styles.card, ...(shake ? styles.shake : {}) }}>
        <div style={styles.titleBar}>
          <div style={styles.trafficLights}>
            <div style={{ ...styles.dot, background: '#f87171' }} />
            <div style={{ ...styles.dot, background: '#fbbf24' }} />
            <div style={{ ...styles.dot, background: '#4ade80' }} />
          </div>
          <span style={styles.titleBarText}>login.cnae</span>
        </div>
        <div style={styles.body}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <BarChart2 size={22} color="#d97706" strokeWidth={2} />
            </div>
            <div>
              <div style={styles.logoTitle}>Gotham Search</div>
              <div style={styles.logoSub}>Sistema de Inteligencia Empresarial</div>
            </div>
          </div>
          <div style={styles.divider} />
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>CPF</label>
              <input type="text" inputMode="numeric" placeholder="000.000.000-00"
                value={cpf} onChange={handleCpfChange} style={styles.input}
                ref={cpfRef} autoComplete="username" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>CÓDIGO DE ACESSO</label>
              <div style={styles.inputWrap}>
                <input ref={codigoRef} type={showCodigo ? 'text' : 'password'}
                  inputMode="numeric" placeholder="••••••" value={codigo}
                  onChange={handleCodigoChange}
                  style={{ ...styles.input, paddingRight: 40 }}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowCodigo(v => !v)}
                  style={styles.eyeBtn} tabIndex={-1}
                  aria-label={showCodigo ? 'Ocultar' : 'Mostrar'}>
                  {showCodigo ? <EyeOff size={14} color="#a89868" /> : <Eye size={14} color="#a89868" />}
                </button>
              </div>
            </div>
            {erro && <div style={styles.erro} role="alert">{erro}</div>}
            <button type="submit" disabled={loading}
              style={{ ...styles.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? <span style={styles.spinner} /> : <LogIn size={15} color="#2c2416" />}
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
      <p style={styles.footer}>Gotham Search v1.0 — Dados: Lista CNAE + BrasilAPI</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#d4c4a8', zIndex: 9999, padding: 16 },
  bgDots: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#c2b090 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' },
  card: { position: 'relative', width: '100%', maxWidth: 380, background: '#f5f1e8', border: '1.5px solid #c8b888', borderRadius: 10, boxShadow: '0 8px 32px rgba(44,36,22,0.18)', overflow: 'hidden', transition: 'transform 0.1s' },
  shake: { animation: 'shake 0.45s ease' },
  titleBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#ede8da', borderBottom: '1px solid #c8b888' },
  trafficLights: { display: 'flex', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)' },
  titleBarText: { fontSize: 12, color: '#7a6a4a', fontFamily: 'inherit', flex: 1, textAlign: 'center' },
  body: { padding: '24px 28px 28px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoIcon: { width: 44, height: 44, borderRadius: 10, background: '#fef3c7', border: '1.5px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoTitle: { fontSize: 16, fontWeight: 700, color: '#2c2416', letterSpacing: '0.05em', fontFamily: 'inherit' },
  logoSub: { fontSize: 10, color: '#7a6a4a', fontFamily: 'inherit', marginTop: 2 },
  divider: { height: 1, background: '#ddd0b0', marginBottom: 22 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 10, fontWeight: 600, color: '#7a6a4a', letterSpacing: '0.1em', fontFamily: 'inherit' },
  inputWrap: { position: 'relative' },
  input: { width: '100%', padding: '10px 12px', background: '#faf8f2', border: '1.5px solid #c8b888', borderRadius: 6, fontSize: 14, color: '#2c2416', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  erro: { fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontFamily: 'inherit' },
  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: '#fbbf24', border: '1.5px solid #d97706', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#2c2416', fontFamily: 'inherit', marginTop: 4, width: '100%' },
  spinner: { display: 'inline-block', width: 14, height: 14, border: '2px solid #2c241640', borderTopColor: '#2c2416', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  footer: { position: 'relative', marginTop: 20, fontSize: 10, color: '#a89868', fontFamily: 'inherit', letterSpacing: '0.05em' },
}
```

- [ ] **Step 2: Atualizar `app/page.tsx` para usar sessão Supabase**

```tsx
// app/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LoginScreen } from '@/components/LoginScreen'
import { createClient } from '@/lib/supabase/client'

const CnaeDesktop = dynamic(
  () => import('@/components/CnaeDesktop').then(m => ({ default: m.CnaeDesktop })),
  { ssr: false }
)

export default function Home() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null) // null = carregando

  useEffect(() => {
    const supabase = createClient()

    // Verificar sessão atual
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAutenticado(!!user)
    })

    // Ouvir mudanças de sessão
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

  // Tela de carregamento durante verificação de sessão
  if (autenticado === null) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#d4c4a8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: '3px solid #c8b888', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return autenticado
    ? <CnaeDesktop onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />
}
```

- [ ] **Step 3: Criar `app/api/auth/logout/route.ts`**

```typescript
// app/api/auth/logout/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Testar fluxo de login manualmente**

```bash
npm run dev
# Abrir http://localhost:3000
# Usar CPF: 041.194.801-60 | Código: 258510
# Deve abrir o desktop do sistema
```

- [ ] **Step 6: Commit**

```bash
git add components/LoginScreen.tsx app/page.tsx app/api/auth/logout/route.ts
git commit -m "feat: replace hardcoded auth with Supabase Auth (CPF+code login)"
```

---

## Task 6: Proteger API routes + cache CNPJ + histórico de buscas

**Files:**
- Modify: `app/api/busca-cnae/route.ts`
- Modify: `app/api/cnpj/[cnpj]/route.ts`

### 6a — Rota `/api/busca-cnae`

A validação de sessão já está no middleware (Task 3). Aqui adicionamos o registro no `historico_buscas` após cada busca bem-sucedida.

- [ ] **Step 1: Adicionar gravação de histórico em `app/api/busca-cnae/route.ts`**

Localizar no topo do arquivo e adicionar o import:
```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
```

No handler `POST`, localizar o bloco `return NextResponse.json(result)` (linha ~122) e substituir por:

```typescript
    // Gravar histórico em background (não bloquear a resposta)
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const adminClient = await createAdminClient()
        await adminClient.from('historico_buscas').insert({
          usuario_id: user.id,
          cnaes: cnaes.map(String),
          params: body,
          total_resultados: result.total,
        })
      }
    } catch { /* falha silenciosa — não prejudica a busca */ }

    return NextResponse.json(result)
```

### 6b — Rota `/api/cnpj/[cnpj]`

Antes de chamar BrasilAPI, verifica o cache no Supabase. Se existir e não estiver expirado, retorna imediatamente. Caso contrário, busca, grava no cache e retorna.

- [ ] **Step 2: Atualizar `app/api/cnpj/[cnpj]/route.ts`**

Adicionar import no topo:
```typescript
import { createAdminClient } from '@/lib/supabase/server'
```

Substituir o início do handler `GET` (após `const digits = cnpj.replace(/\D/g, '')` e a validação de 14 dígitos) para verificar cache:

```typescript
  // ─ Verificar cache Supabase ─
  try {
    const adminClient = await createAdminClient()
    const { data: cached } = await adminClient
      .from('cache_empresas')
      .select('dados, expira_em')
      .eq('cnpj', digits)
      .single()

    if (cached && new Date(cached.expira_em) > new Date()) {
      return NextResponse.json(cached.dados)
    }
  } catch { /* cache miss — continua para BrasilAPI */ }

  // ─ BrasilAPI (código existente) ─
  try {
    const res = await fetch( ... // código existente
```

E antes de `return NextResponse.json(empresa)` (após a normalização dos dados), adicionar:

```typescript
    // Gravar no cache (7 dias de validade)
    try {
      const adminClient = await createAdminClient()
      await adminClient.from('cache_empresas').upsert({
        cnpj: digits,
        dados: empresa,
        fonte: 'brasilapi',
        atualizado_em: new Date().toISOString(),
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'cnpj' })
    } catch { /* falha silenciosa */ }

    return NextResponse.json(empresa)
```

- [ ] **Step 3: Verificar compilação e commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add app/api/busca-cnae/route.ts app/api/cnpj/[cnpj]/route.ts
git commit -m "feat: add Supabase session validation, search history and CNPJ cache"
```

---

## PHASE 2 — UX MELHORIAS

> **Pré-requisito:** Phase 1 deve estar completa e funcionando (usuário consegue fazer login via Supabase).

---

## Task 7: Expandir tipos em `types/empresa.ts`

*(Idêntico ao Task 1 do plano anterior `2026-04-15-ux-melhorias-busca.md`)*

- [ ] **Step 1: Adicionar `enriquecida?: boolean` à interface `Empresa`**

Em `types/empresa.ts`, localizar o final de `Empresa` (antes do fechamento `}`):
```typescript
  socios?: Socio[]
}
```
Adicionar após `socios`:
```typescript
  socios?: Socio[]
  enriquecida?: boolean   // true após enriquecimento via BrasilAPI/cache Supabase
}
```

- [ ] **Step 2: Substituir `BuscaParams` completamente**

Localizar o bloco `export interface BuscaParams` (linhas 98-106) e substituir por:

```typescript
export interface BuscaParams {
  cnae?: string
  cnpjs?: string
  termosBusca?: string
  termoBuscaEm?: 'R' | 'F' | 'A'
  incluirCnaesSecundarios?: boolean
  somenteMatrizes?: boolean
  simplesNacional?: 'ignorar' | 'apenas' | 'excluir'
  mei?: 'ignorar' | 'apenas' | 'excluir'
  capitalSocialMinimo?: number
  capitalSocialMaximo?: number
  telefoneObrigatorio?: boolean
  emailObrigatorio?: boolean
  dataInicio?: string
  dataFim?: string
  uf?: string
  municipio?: string
  pagina?: number
  porPagina?: number
  filtroPortes?: string[]
  filtroSituacoes?: string[]
}
```

- [ ] **Step 3: Verificar compilação e commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add types/empresa.ts
git commit -m "feat: expand BuscaParams with all Lista CNAE params and add enriquecida flag"
```

---

## Task 8: Criar `hooks/useEnrichment.ts`

Este hook agora verifica o cache Supabase antes de chamar BrasilAPI — evita chamadas desnecessárias e respeita o limite de rate da API.

- [ ] **Step 1: Criar o arquivo**

```typescript
// hooks/useEnrichment.ts
'use client'

import { useState, useCallback, useRef } from 'react'
import type { Empresa } from '@/types/empresa'

const BATCH_SIZE = 10

export function useEnrichment() {
  const [enrichedMap, setEnrichedMap] = useState<Map<string, Empresa>>(new Map())
  const [enrichingCnpjs, setEnrichingCnpjs] = useState<Set<string>>(new Set())
  const cancelRef = useRef(false)

  const enrich = useCallback(async (empresas: Empresa[]) => {
    cancelRef.current = true
    await new Promise(r => setTimeout(r, 0))
    cancelRef.current = false

    setEnrichedMap(new Map())
    setEnrichingCnpjs(new Set())

    const todo = empresas.filter(e => !e.enriquecida)
    if (todo.length === 0) return

    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
      if (cancelRef.current) return

      const batch = todo.slice(i, i + BATCH_SIZE)

      setEnrichingCnpjs(prev => {
        const next = new Set(prev)
        batch.forEach(e => next.add(e.cnpj))
        return next
      })

      await Promise.all(
        batch.map(async (empresa) => {
          if (cancelRef.current) return
          try {
            const digits = empresa.cnpj.replace(/\D/g, '')
            const res = await fetch(`/api/cnpj/${digits}`)
            if (res.ok && !cancelRef.current) {
              const data: Empresa = await res.json()
              data.enriquecida = true
              setEnrichedMap(prev => new Map(prev).set(empresa.cnpj, data))
            }
          } catch {
            // falha silenciosa
          } finally {
            if (!cancelRef.current) {
              setEnrichingCnpjs(prev => {
                const next = new Set(prev)
                next.delete(empresa.cnpj)
                return next
              })
            }
          }
        })
      )
    }
  }, [])

  return { enrich, enrichedMap, enrichingCnpjs }
}
```

- [ ] **Step 2: Verificar e commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add hooks/useEnrichment.ts
git commit -m "feat: add useEnrichment hook with Supabase cache awareness"
```

---

## Task 9: Reescrever `components/windows/BuscaWindow.tsx`

*(O código completo está documentado no plano anterior `2026-04-15-ux-melhorias-busca.md` — Task 3. Copiar exatamente.)*

- [ ] **Step 1: Substituir o arquivo inteiro pelo código do Task 3 do plano anterior**

O arquivo está documentado em `docs/superpowers/plans/2026-04-15-ux-melhorias-busca.md`, Task 3, Step 1. Copiar o conteúdo completo lá descrito.

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/windows/BuscaWindow.tsx
git commit -m "feat: rewrite BuscaWindow with 4-tab filter interface"
```

---

## Task 10: Atualizar `components/windows/ResultadosWindow.tsx`

*(O diff completo está documentado no plano anterior — Task 4. Aplicar os 6 steps lá descritos.)*

- [ ] **Step 1: Atualizar interface Props** (ver plano anterior Task 4 Step 1)
- [ ] **Step 2: Atualizar destructuring** (ver plano anterior Task 4 Step 2)
- [ ] **Step 3: Atualizar useMemo filtered** (ver plano anterior Task 4 Step 3)
- [ ] **Step 4: Adicionar onClick na `<tr>`** (ver plano anterior Task 4 Step 4)
- [ ] **Step 5: Atualizar coluna Situacao** (ver plano anterior Task 4 Step 5)
- [ ] **Step 6: Adicionar aviso de filtro** (ver plano anterior Task 4 Step 6)

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add components/windows/ResultadosWindow.tsx
git commit -m "feat: add row click, enrichment display and frontend filters to ResultadosWindow"
```

---

## Task 11: Atualizar `components/windows/FichaWindow.tsx`

*(Ver plano anterior Task 5)*

- [ ] **Step 1: Atualizar useEffect** (ver plano anterior Task 5 Step 1)

- [ ] **Step 2: Commit**

```bash
git add components/windows/FichaWindow.tsx
git commit -m "feat: skip BrasilAPI fetch in FichaWindow when empresa is already enriched"
```

---

## Task 12: Atualizar `components/CnaeDesktop.tsx`

*(Ver plano anterior Task 6 — todos os steps)*

Mudanças adicionais à Phase 1: o `onLogout` agora chama `/api/auth/logout` via `handleLogout` em `app/page.tsx`, então `CnaeDesktop` não precisa se preocupar com a sessão — apenas chamar `onLogout?.()`.

- [ ] **Step 1–6**: Seguir exatamente Task 6 do plano anterior.

- [ ] **Step 7: Commit**

```bash
git add components/CnaeDesktop.tsx
git commit -m "feat: wire useEnrichment and full pagination params in CnaeDesktop"
```

---

## Task 13: Atualizar `components/MobileLayout.tsx`

*(Ver plano anterior Task 7 — todos os steps)*

- [ ] **Steps 1–5**: Seguir Task 7 do plano anterior.

- [ ] **Step 6: Build final de verificação**

```bash
npm run build 2>&1 | tail -30
```

Esperado: build limpo sem erros TypeScript nem warnings críticos.

- [ ] **Step 7: Commit final**

```bash
git add components/MobileLayout.tsx
git commit -m "feat: wire useEnrichment in MobileLayout"
```

---

## Checklist de segurança pós-implementação

- [ ] `.env.development.local` está em `.gitignore` — verificar com `git status` que não aparece como untracked
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca é exposta no browser (só usada em `createAdminClient` que é server-only)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` é pública por design (prefixo `NEXT_PUBLIC_`) — comportamento esperado
- [ ] RLS ativo em todas as tabelas — verificar no dashboard: Table Editor → cada tabela → RLS enabled
- [ ] Rotas de API retornam 401 sem sessão válida (middleware Task 3)
- [ ] Usuário só vê seus próprios dados (políticas RLS `auth.uid() = usuario_id`)
- [ ] Cache de CNPJ gravado via service role (bypassa RLS) — correto, dados públicos da Receita Federal
- [ ] Senha do usuário inicial (`258510`) deve ser trocada após primeiro acesso

---

## Self-Review

| Requisito | Task |
|-----------|------|
| Supabase Auth substituindo hardcoded | Task 5 |
| Sessão persistente via cookies | Task 3 (middleware) |
| RLS em todas as tabelas | Task 4 (002_rls.sql) |
| Histórico de buscas por usuário | Task 6a |
| Cache CNPJ compartilhado (7 dias) | Task 6b |
| API routes protegidas por sessão | Task 3 (middleware) |
| Service role para escrita admin | Task 2 (createAdminClient) |
| BuscaWindow 4 abas + filtros | Task 9 |
| Clicar na linha abre FichaWindow | Task 10 |
| Enriquecimento CNPJ progressivo | Task 8 |
| FichaWindow usa dados pré-carregados | Task 11 |
| Filtros porte/situação/município frontend | Task 10 |
| Paginação com todos os filtros | Task 12 |
