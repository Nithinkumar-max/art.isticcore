import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-ttl'
import {
  SESSION_TOKEN_COOKIE,
  establishSession,
  sessionTokenCookieOptions,
} from '@/lib/services/sessions'

/**
 * POST /api/admin/login
 * Dedicated admin sign-in, independent of the customer login page.
 *
 * This accepts the ADMIN/SUPER_ADMIN email + password the team provisions via
 * scripts/create-admin.mjs (seeded with ADMIN_INITIAL_PASSWORD and ADMIN_EMAILS).
 * It performs a normal Supabase password sign-in, then insists the account is
 * actually an admin in public.users — a plain customer account is rejected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
    const email = body?.email?.trim().toLowerCase() ?? ''
    const password = body?.password ?? ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
      return NextResponse.json({ error: 'Enter your admin email and password.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Could not establish the session.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = profile?.role as string | undefined

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      // Valid customer or unknown account — not an admin. Kill the session.
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'This account is not authorized for the Studio. Sign in with an admin account.' },
        { status: 403 },
      )
    }

    // Absolute 60-minute admin session — stamp login time for the proxy, and
    // mint the single-session token (supersedes any earlier login anywhere).
    const cookieStore = await (await import('next/headers')).cookies()
    cookieStore.set(SESSION_COOKIE_NAME, String(Date.now()), sessionCookieOptions())
    const token = await establishSession(user.id)
    cookieStore.set(SESSION_TOKEN_COOKIE, token, sessionTokenCookieOptions())

    return NextResponse.json({ ok: true, redirect: '/admin' })
  } catch (error: unknown) {
    console.error('POST /api/admin/login error:', error)
    return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 500 })
  }
}