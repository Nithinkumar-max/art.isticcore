import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-ttl'

/**
 * POST /api/auth/logout
 * Signs the browser out of Supabase and clears the session-timeout cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const cookieStore = await (await import('next/headers')).cookies()
    cookieStore.set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('POST /api/auth/logout error:', error)
    return NextResponse.json({ error: 'Could not sign out. Try again.' }, { status: 500 })
  }
}
