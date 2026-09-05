import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_TIMEOUT_MS, sessionCookieOptions } from '@/lib/session-ttl'

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
    const isAdminAuthPage = pathname === '/admin/login'

    // ── Session Timeout (absolute 60 minutes since login) ────────────────
    // Supabase auto-refreshes access tokens (resetting `iat`), so JWT-iat
    // checks never fire. Instead we stamp a login-time cookie (`art_session_start`)
    // at every successful login and compare the wall-clock age. Sessions older
    // than 60 minutes are signed out regardless of refresh activity.
    if (user) {
      const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value
      const parsed = raw ? Number(raw) : NaN
      let startMs = Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now()
      if (startMs > Date.now()) startMs = Date.now() // guard against absurd future values

      const aged = Date.now() - startMs
      if (aged > SESSION_TIMEOUT_MS) {
        const url = request.nextUrl.clone()
        url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/login'
        url.searchParams.set('redirect', pathname)
        url.searchParams.set('reason', 'session_expired')
        await supabase.auth.signOut()
        const response = NextResponse.redirect(url)
        response.cookies.set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 })
        return response
      }

      // Absent stamp (pre-feature session or first request after deploy) → adopt
      // this moment as the start so the absolute 60-minute window is enforced
      // from here on out.
      if (!raw || parsed !== startMs) {
        supabaseResponse.cookies.set(SESSION_COOKIE_NAME, String(startMs), sessionCookieOptions())
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
    if (pathname.startsWith('/admin') && !isAdminAuthPage) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }

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

    // Redirect logged-in users away from /login — leave the admin login page
    // alone (a customer may legitimately view it to switch accounts).
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
