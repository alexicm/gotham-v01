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

-- ─── MANUAL STEP REQUIRED ────────────────────────────────────────────────────────
-- Após aplicar esta migração no Supabase Dashboard, execute o comando abaixo no SQL Editor
-- para promover o usuário inicial a admin:
--
-- UPDATE public.perfis
-- SET nivel = 'admin',
--     modulos_permitidos = ARRAY['busca','terminal','cnpj','admin']
-- WHERE id = '3bd40999-3534-4473-a3e6-2406cc4088d2';
