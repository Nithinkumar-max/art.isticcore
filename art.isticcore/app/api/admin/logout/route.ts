import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-ttl'

/**
 * POST /api/admin/logout
 * Signs the current admin out of Supabase and clears the session-timeout
 * cookie, then the client redirects to /admin/login.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    const cookieStore = await (await import('next/headers')).cookies()
    cookieStore.set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('POST /api/admin/logout error:', error)
    return NextResponse.json({ error: 'Could not sign out. Try again.' }, { status: 500 })
  }
}
