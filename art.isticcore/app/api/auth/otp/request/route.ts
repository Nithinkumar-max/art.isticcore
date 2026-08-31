import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { clientIp, isSendThrottled, issueLoginCode, rateLimitIp } from '@/lib/otp'
import { sendLoginCodeEmail } from '@/lib/email'

const bodySchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
})

/**
 * POST /api/auth/otp/request
 * Generates our own 6-digit login code and emails it via Resend.
 * Supabase only mints an (unsent) magiclink token so the session can be
 * created server-side after the user repeats the code — no Supabase email.
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

    if (await isSendThrottled(email)) {
      return NextResponse.json({ error: 'A code was just sent. Wait a minute and try again.' }, { status: 429 })
    }

    // Mints the magiclink token server-side (auto-creates the auth user +
    // fires the public.users trigger). Nothing is emailed by Supabase.
    const admin = await createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (error || !data) {
      console.error('POST /api/auth/otp/request generateLink error:', error)
      return NextResponse.json({ error: 'Could not start sign-in. Try again.' }, { status: 500 })
    }

    const tokenHash = data.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.json({ error: 'Could not prepare the sign-in code. Try again.' }, { status: 500 })
    }

    const code = await issueLoginCode(email, tokenHash)

    const delivery = await sendLoginCodeEmail({ email, code })
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

    const masked = email.replace(/^(.{2}).*(@.*)$/, '$1•••$2')
    return NextResponse.json({ sent: true, maskedEmail: masked })
  } catch (error: unknown) {
    console.error('API /api/auth/otp/request error:', error)
    const message =
      error instanceof Error && error.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Server is missing SUPABASE_SERVICE_ROLE_KEY — required to issue login codes.'
        : 'Could not send the code. Try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
