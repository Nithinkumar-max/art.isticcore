import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { clientIp, isResetThrottled, issueResetCode, rateLimitIp } from '@/lib/otp'
import { sendPasswordResetEmail } from '@/lib/email'

const bodySchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
})

/**
 * POST /api/auth/forgot/request
 * Checks the account exists (small business store — this store already exposes
 * account existence on /api/auth/register, so a clear message is acceptable
 * and much better UX), then emails a 6-digit password-reset code via Resend.
 */
export async function POST(request: NextRequest) {
  try {
    if (!rateLimitIp(clientIp(request.headers), 8, 600)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }
    const email = parsed.data.email.trim().toLowerCase()

    const admin = await createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const account = error ? null : (data?.users ?? []).find((u) => u.email?.toLowerCase() === email)
    if (!account) {
      return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 })
    }

    if (await isResetThrottled(email)) {
      return NextResponse.json({ error: 'A code was just sent. Wait a minute and try again.' }, { status: 429 })
    }

    const code = await issueResetCode(email)
    const delivery = await sendPasswordResetEmail({ email, code })
    if (!delivery.success) {
      return NextResponse.json(
        {
          error:
            delivery.reason === 'unconfigured'
              ? 'Email delivery is not configured yet (RESEND_API_KEY missing on the server).'
              : 'Could not send the email right now. Try again shortly.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json({ sent: true, maskedEmail: maskEmail(email) })
  } catch (error: unknown) {
    console.error('API /api/auth/forgot/request error:', error)
    const message =
      error instanceof Error && error.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Server is missing SUPABASE_SERVICE_ROLE_KEY — required to verify accounts.'
        : 'Could not send the code. Try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function maskEmail(email: string): string {
  return email.replace(/^(.{2}).*(@.*)$/, '$1•••$2')
}