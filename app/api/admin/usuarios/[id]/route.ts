// app/api/admin/usuarios/[id]/route.ts
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await verificarAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.nivel !== undefined) {
    if (!NIVEIS_VALIDOS.includes(body.nivel as typeof NIVEIS_VALIDOS[number])) {
      return NextResponse.json({ error: `Nível inválido. Use: ${NIVEIS_VALIDOS.join(', ')}` }, { status: 400 })
    }
    updates.nivel = body.nivel
  }

  if (body.modulosPermitidos !== undefined) {
    updates.modulos_permitidos = body.modulosPermitidos
  }

  if (body.ativo !== undefined) {
    if (typeof body.ativo !== 'boolean') {
      return NextResponse.json({ error: 'Campo ativo deve ser boolean' }, { status: 400 })
    }
    updates.ativo = body.ativo
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('perfis')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
