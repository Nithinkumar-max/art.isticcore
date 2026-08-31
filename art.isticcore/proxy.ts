import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

let _adminClient: ReturnType<typeof createSupabaseJsClient> | null = null
function createAdminClient() {
  if (_adminClient) return _adminClient
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  _adminClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  return _adminClient
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options })
            supabaseResponse.cookies.set({ name, value, ...options })
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // ── Session Timeout (1 hour) ─────────────────────────────────────────────
    if (user) {
      const authCookieEntry = [...request.cookies.getAll()].find(
        (c) => c.name.endsWith('-auth-token') && c.name.startsWith('sb-'),
      )
      const sessionCookie = authCookieEntry?.value
      if (sessionCookie) {
        try {
          const parts = sessionCookie.split('.')
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
            const iat = payload.iat as number | undefined
            if (iat) {
              const sessionAgeSeconds = Math.floor(Date.now() / 1000) - iat
              const ONE_HOUR = 3600
              if (sessionAgeSeconds > ONE_HOUR) {
                await supabase.auth.signOut()
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                url.searchParams.set('redirect', pathname)
                url.searchParams.set('reason', 'session_expired')
                return NextResponse.redirect(url)
              }
            }
          }
        } catch {
          // If we can't parse the JWT, let it through
        }
      }
    }

    // ── Protect /account/* routes ──────────────────────────────────────────────
    if (pathname.startsWith('/account') && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // ── Protect /admin/* routes ───────────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }

      // ALWAYS check DB for admin role — JWT user_metadata is stale on page
      // refresh because the client-side sync hasn't run yet. One lightweight
      // query per admin navigation is acceptable.
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const dbRole = profile?.role as string | undefined
      if (dbRole !== 'ADMIN' && dbRole !== 'SUPER_ADMIN') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }

    // ── Redirect logged-in users away from /login ──────────────────────────────
    if (pathname === '/login' && user) {
      const redirect = request.nextUrl.searchParams.get('redirect') ?? '/'
      const url = request.nextUrl.clone()
      url.pathname = redirect
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error('Proxy Supabase auth refresh error:', error)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
