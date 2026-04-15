// app/api/terminal/stats/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('historico_buscas')
    .select('total_resultados, criado_em')
    .eq('usuario_id', user.id)
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total_buscas = data?.length ?? 0
  const total_resultados = data?.reduce((sum, h) => sum + (h.total_resultados ?? 0), 0) ?? 0
  const primeira_busca = data?.[0]?.criado_em ?? null

  return NextResponse.json({ total_buscas, total_resultados, primeira_busca })
}
