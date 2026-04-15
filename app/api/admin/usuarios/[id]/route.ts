// app/api/admin/usuarios/[id]/route.ts
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

// PATCH /api/admin/usuarios/[id] — atualizar nível, módulos ou status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await verificarAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.nivel !== undefined) updates.nivel = body.nivel
  if (body.modulosPermitidos !== undefined) updates.modulos_permitidos = body.modulosPermitidos
  if (body.ativo !== undefined) updates.ativo = body.ativo

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('perfis')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
