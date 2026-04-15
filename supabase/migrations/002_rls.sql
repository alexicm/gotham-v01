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
