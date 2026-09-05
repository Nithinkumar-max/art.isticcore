import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_TIMEOUT_MS, sessionCookieOptions } from '@/lib/session-ttl'
import {
  SESSION_TOKEN_COOKIE,
  isSessionValid,
  sessionTokenCookieOptions,
} from '@/lib/services/sessions'

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

/** Carry sign-out cookies (cleared Supabase auth etc.) onto a redirect. */
function copyClearedCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
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
    const isAdminAuthPage = pathname === '/admin/login'

    // ── Single-Session Token Enforcement ──────────────────────────────────
    // Exactly one active session per account (public.user_sessions, 1-hour
    // life, mirrored by an httpOnly cookie). A missing / expired / superseded
    // token means this browser is no longer the active session — sign it out
    // so logging in from another browser or device invalidates it.
    if (user && !(await isSessionValid(user.id, request.cookies.get(SESSION_TOKEN_COOKIE)?.value))) {
      const isProtected = pathname.startsWith('/account') || (pathname.startsWith('/admin') && !isAdminAuthPage)
      await supabase.auth.signOut()
      supabaseResponse.cookies.set(SESSION_TOKEN_COOKIE, '', { ...sessionTokenCookieOptions(), maxAge: 0 })
      supabaseResponse.cookies.set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 })

      if (isProtected) {
        const url = request.nextUrl.clone()
        url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/login'
        url.searchParams.set('redirect', pathname)
        url.searchParams.set('reason', 'session_revoked')
        const response = NextResponse.redirect(url)
        copyClearedCookies(supabaseResponse, response)
        return response
      }
      return supabaseResponse
    }

    // ── Session Timeout (absolute 60 minutes since login) ────────────────────
    // Supabase auto-refreshes access tokens (resetting `iat`), so JWT-iat checks
    // never fire. Instead we stamp a login-time cookie (`art_session_start`) at
    // every successful login and compare the wall-clock age. Sessions older than
    // 60 minutes are signed out regardless of refresh activity.
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
        response.cookies.set(SESSION_TOKEN_COOKIE, '', { ...sessionTokenCookieOptions(), maxAge: 0 })
        copyClearedCookies(supabaseResponse, response)
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
        // Non-admin signed in → keep their session but send them to their home.
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
