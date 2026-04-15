// app/api/terminal/historico/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const n = Math.min(parseInt(searchParams.get('n') ?? '10', 10), 50)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('historico_buscas')
    .select('id, cnaes, params, total_resultados, criado_em')
    .eq('usuario_id', user.id)
    .order('criado_em', { ascending: false })
    .limit(n)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ historico: data ?? [] })
}
