// app/api/admin/usuarios/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function verificarAdmin() {
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
