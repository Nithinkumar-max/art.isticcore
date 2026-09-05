import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-ttl'
import {
  SESSION_TOKEN_COOKIE,
  revokeSession,
  sessionTokenCookieOptions,
} from '@/lib/services/sessions'

/**
 * POST /api/auth/logout
 * Revokes the single-session token and signs the browser out of the
 * Supabase session. Any other browser stays unaffected (the token is
 * unique per sign-in).
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_TOKEN_COOKIE)?.value
    await revokeSession(token)

    const supabase = await createClient()
    await supabase.auth.signOut()

    const cookieStore = await (await import('next/headers')).cookies()
    cookieStore.set(SESSION_TOKEN_COOKIE, '', { ...sessionTokenCookieOptions(), maxAge: 0 })
    cookieStore.set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('POST /api/auth/logout error:', error)
    return NextResponse.json({ error: 'Could not sign out. Try again.' }, { status: 500 })
  }
}