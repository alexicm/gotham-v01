// app/api/admin/usuarios/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const NIVEIS_VALIDOS = ['admin', 'agente'] as const

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

export async function POST(request: Request) {
  const adminUser = await verificarAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { nome, cpf, codigo, nivel, modulosPermitidos } = body as Record<string, string>

  if (!nome || !cpf || !codigo || !nivel) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, cpf, codigo, nivel' }, { status: 400 })
  }

  const cpfDigits = String(cpf).replace(/\D/g, '')
  if (cpfDigits.length !== 11) {
    return NextResponse.json({ error: 'CPF deve ter 11 dígitos' }, { status: 400 })
  }

  if (String(codigo).length < 4) {
    return NextResponse.json({ error: 'Código de acesso deve ter no mínimo 4 caracteres' }, { status: 400 })
  }

  if (!NIVEIS_VALIDOS.includes(nivel as typeof NIVEIS_VALIDOS[number])) {
    return NextResponse.json({ error: `Nível inválido. Use: ${NIVEIS_VALIDOS.join(', ')}` }, { status: 400 })
  }

  const email = `${cpfDigits}@gotham.app`
  const supabase = await createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: codigo,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

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
    const { error: rollbackError } = await supabase.auth.admin.deleteUser(authData.user.id)
    if (rollbackError) {
      console.error('[admin/usuarios] Rollback falhou após erro de perfil:', rollbackError.message)
    }
    return NextResponse.json({ error: perfilError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: authData.user.id }, { status: 201 })
}
