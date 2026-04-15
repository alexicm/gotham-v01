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
