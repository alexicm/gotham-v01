import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, cpf, nivel, modulos_permitidos, foto_url, genero')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ perfil: data })
}

export async function PUT(request: Request) {
  let body: { nome?: unknown; genero?: unknown; foto_url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const update: Record<string, unknown> = {}

  if (body.nome !== undefined) {
    if (typeof body.nome !== 'string' || body.nome.trim().length === 0) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    }
    update.nome = body.nome.trim()
  }

  if (body.genero !== undefined) {
    if (body.genero !== 'm' && body.genero !== 'f' && body.genero !== null) {
      return NextResponse.json({ error: 'Gênero inválido' }, { status: 400 })
    }
    update.genero = body.genero
  }

  if (body.foto_url !== undefined) {
    if (typeof body.foto_url !== 'string' && body.foto_url !== null) {
      return NextResponse.json({ error: 'foto_url inválida' }, { status: 400 })
    }
    update.foto_url = body.foto_url
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('perfis')
    .update(update)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
