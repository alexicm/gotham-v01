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
