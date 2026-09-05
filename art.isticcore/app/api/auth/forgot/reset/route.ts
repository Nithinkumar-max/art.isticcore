import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { clientIp, rateLimitIp, verifyResetCode } from '@/lib/otp'

const bodySchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  password: z.string().min(8, 'Password needs at least 8 characters').max(72),
})

/**
 * POST /api/auth/forgot/reset
 * Verifies the emailed reset code, then sets the new password via the admin
 * API (service role). Changing the password revokes this user's other
 * sessions, which is the safe behavior after a password reset.
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

    const verdict = await verifyResetCode(email, parsed.data.code)
    switch (verdict) {
      case 'expired':
        return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 })
      case 'locked':
        return NextResponse.json({ error: 'Too many wrong attempts. Request a fresh code.' }, { status: 429 })
      case 'invalid':
        return NextResponse.json({ error: 'That code is not right. Check and retry.' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const account = listError ? null : (users?.users ?? []).find((u) => u.email?.toLowerCase() === email)
    if (!account) {
      return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 })
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(account.id, {
      password: parsed.data.password,
    })
    if (updateError) {
      console.error('POST /api/auth/forgot/reset updateUserById error:', updateError)
      return NextResponse.json({ error: 'Could not reset your password. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('API /api/auth/forgot/reset error:', error)
    return NextResponse.json({ error: 'Could not reset your password. Try again.' }, { status: 500 })
  }
}