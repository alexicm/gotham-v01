// app/api/auth/verify-senha/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: { senha?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { senha } = body
  if (!senha || typeof senha !== 'string' || senha.length < 4) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senha,
  })

  if (error) {
    return NextResponse.json({ error: 'Código incorreto' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
