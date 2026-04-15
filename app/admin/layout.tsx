// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) console.error('[AdminLayout] Erro de auth:', authError.message)
  if (!user) redirect('/')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('nivel')
    .eq('id', user.id)
    .single()
  if (perfilError) console.error('[AdminLayout] Erro ao buscar perfil:', perfilError.message)

  if (perfil?.nivel !== 'admin') redirect('/')

  return <>{children}</>
}
