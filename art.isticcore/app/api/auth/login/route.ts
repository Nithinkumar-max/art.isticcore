import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { clientIp, rateLimitIp } from '@/lib/otp'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-ttl'

const bodySchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Enter your password.').max(72),
})

/**
 * POST /api/auth/login
 * Customer password sign-in. Runs entirely server-side so the SSR client can
 * write the httpOnly session cookies onto this very response — the browser is
 * reliably signed in the moment this resolves (same mechanism as OTP verify
 * and admin login). The client then calls /api/auth/profile to sync the DB
 * profile and stamp the 60-minute login-time cookie.
 */
export async function POST(request: NextRequest) {
  try {
    if (!rateLimitIp(clientIp(request.headers), 10, 600)) {
      return NextResponse.json({ error: 'Too many sign-in attempts. Try again in a few minutes.' }, { status: 429 })
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }
    const email = parsed.data.email.trim().toLowerCase()

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    })
    if (error) {
      if (error.message === 'Invalid login credentials') {
        return NextResponse.json({ error: 'Wrong email or password. Please try again.' }, { status: 401 })
      }
      if (error.message.toLowerCase().includes('not confirmed')) {
        return NextResponse.json({ error: 'Confirm your email before signing in. Check your inbox.' }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // Stamp the absolute login-time cookie → proxy enforces 60-min expiry.
    const cookieStore = await (await import('next/headers')).cookies()
    cookieStore.set(SESSION_COOKIE_NAME, String(Date.now()), sessionCookieOptions())

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 500 })
  }
}