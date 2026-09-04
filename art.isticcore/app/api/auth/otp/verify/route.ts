import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { clientIp, consumeLoginCode, rateLimitIp } from '@/lib/otp'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-ttl'

const bodySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

/**
 * POST /api/auth/otp/verify
 * Checks our self-generated code, then exchanges the stashed Supabase
 * magiclink token hash for a real session. The SSR cookie client persists
 * the session, so the browser is signed in once this responds.
 */
export async function POST(request: NextRequest) {
  try {
    if (!rateLimitIp(clientIp(request.headers), 20, 600)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }
    const email = parsed.data.email.trim().toLowerCase()

    const result = await consumeLoginCode(email, parsed.data.code)
    switch (result.status) {
      case 'expired':
        return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 })
      case 'locked':
        return NextResponse.json({ error: 'Too many wrong attempts. Request a fresh code.' }, { status: 429 })
      case 'invalid':
        return NextResponse.json({ error: 'That code is not right. Check and retry.' }, { status: 400 })
    }

    // Exchange the token hash for a session — cookies are set on this response.
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: result.tokenHash,
    })
    if (error) {
      console.error('POST /api/auth/otp/verify verifyOtp error:', error)
      return NextResponse.json({ error: 'Could not complete sign-in. Request a new code.' }, { status: 401 })
    }

    // Stamp the absolute login-time cookie → proxy enforces 60-min expiry.
    const cookieStore = await (await import('next/headers')).cookies()
    cookieStore.set(SESSION_COOKIE_NAME, String(Date.now()), sessionCookieOptions())

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('API /api/auth/otp/verify error:', error)
    return NextResponse.json({ error: 'Could not verify the code. Try again.' }, { status: 500 })
  }
}
