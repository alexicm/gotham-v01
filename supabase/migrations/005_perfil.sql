-- 005_perfil.sql — Adiciona foto_url e genero ao perfil de usuário

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS genero text
    CHECK (genero IN ('m', 'f'));

-- Storage: o bucket 'avatars' deve ser criado manualmente no Supabase Dashboard:
-- Storage > New bucket > Name: "avatars" > Public: sim > Max file size: 2MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Após criar o bucket, adicionar política de storage no Dashboard:
-- Policy name: "usuario_gerencia_proprio_avatar"
-- INSERT/UPDATE/DELETE: (bucket_id = 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text
-- SELECT: bucket_id = 'avatars'  (leitura pública)
