import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redireciona para / se API protegida e não autenticado
  const isProtectedApi = request.nextUrl.pathname.startsWith('/api/busca-cnae') ||
    request.nextUrl.pathname.startsWith('/api/cnpj')

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Protege a rota /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Verificar nível (usa anon key com sessão do usuário — RLS permite ler próprio perfil)
    const { data: perfil } = await supabase
      .from('perfis')
      .select('nivel')
      .eq('id', user.id)
      .single()

    if (perfil?.nivel !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protege as APIs de admin
  if (request.nextUrl.pathname.startsWith('/api/admin') && !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
