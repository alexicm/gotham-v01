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

-- ─── Lógica de acesso ──────────────────────────────────────────────────────────
-- Usuários normais (agente): leem e atualizam apenas o próprio perfil
-- Admins: leem e atualizam qualquer perfil
-- INSERT: feito exclusivamente pelo service_role nas rotas /api/admin (sem policy necessária)
-- A coluna modulos_permitidos lista módulos permitidos ao usuário; validação na aplicação.
-- ──────────────────────────────────────────────────────────────────────────────

-- SELECT: próprio perfil OU admin pode ver todos
CREATE POLICY "perfil_select"
  ON public.perfis FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT nivel FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- UPDATE: próprio perfil OU admin pode atualizar todos
CREATE POLICY "perfil_update"
  ON public.perfis FOR UPDATE
  USING (
    auth.uid() = id
    OR (SELECT nivel FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'admin'
  )
  WITH CHECK (
    auth.uid() = id
    OR (SELECT nivel FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- DELETE: apenas admins podem deletar perfis
CREATE POLICY "perfil_delete"
  ON public.perfis FOR DELETE
  USING (
    (SELECT nivel FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- ─── PASSO MANUAL OBRIGATÓRIO ─────────────────────────────────────────────────
-- Após aplicar esta migração no Supabase Dashboard > SQL Editor, execute:
--
-- UPDATE public.perfis
-- SET nivel = 'admin',
--     modulos_permitidos = ARRAY['busca','terminal','cnpj','admin']
-- WHERE id = '3bd40999-3534-4473-a3e6-2406cc4088d2';
