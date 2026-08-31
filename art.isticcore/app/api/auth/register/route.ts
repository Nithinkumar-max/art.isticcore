import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { clientIp, rateLimitIp } from '@/lib/otp'

const bodySchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  password: z.string().min(8, 'Password needs at least 8 characters').max(72),
  name: z.string().min(2, 'Tell us your name').max(80),
})

/**
 * POST /api/auth/register
 * Creates the auth user directly via the admin API with email already
 * confirmed — no confirmation email required. The client then signs in with
 * supabase.auth.signInWithPassword as usual.
 */
export async function POST(request: NextRequest) {
  try {
    if (!rateLimitIp(clientIp(request.headers), 5, 900)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }
    const email = parsed.data.email.trim().toLowerCase()

    const admin = await createAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { name: parsed.data.name.trim() },
    })

    if (error || !data?.user) {
      const code = (error as { code?: string } | null)?.code ?? ''
      console.error('POST /api/auth/register createUser error:', error)
      if (code === 'email_exists' || /already|exists/i.test(error?.message ?? '')) {
        return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Could not create your account. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error: unknown) {
    console.error('API /api/auth/register error:', error)
    const message =
      error instanceof Error && error.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Server is missing SUPABASE_SERVICE_ROLE_KEY — required to create accounts.'
        : 'Could not create your account. Try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
