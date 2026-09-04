import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-ttl'

/**
 * GET  → returns the signed-in user's DB profile (true role source).
 * POST → syncs the profile, auto-promotes ADMIN_EMAILS, and writes the
 *        DB role into user_metadata so the proxy can gate /admin without
 *        an extra DB query on every request.
 *
 * Both stamps the login-time cookie (`art_session_start`) once if missing so
 * the proxy can enforce an absolute 60-minute session lifetime, and returns
 * `sessionStart` so the client-side AuthProvider can mirror it.
 */
async function resolveProfile(request: NextRequest, isPost: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ profile: null, sessionStart: null }, { status: 401 })

  // Stamp login-time cookie — set it on POST (a fresh sign-in) or first sight.
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const parsed = raw ? Number(raw) : NaN
  let startMs = Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now()
  if (isPost) startMs = Date.now()
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, String(startMs), sessionCookieOptions())

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, phone, role')
    .eq('id', user.id)
    .single()

  let current = profile

  // Auto-promote configured owner/admin emails. Service-role update:
  // RLS blocks users from changing their own role.
  const email = user.email?.toLowerCase()
  if (current && email && current.role === 'CUSTOMER') {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
    if (adminEmails.includes(email)) {
      try {
        const admin = await createAdminClient()
        const { data: promoted } = await admin
          .from('users')
          .update({ role: 'ADMIN' })
          .eq('id', user.id)
          .select('id, email, name, phone, role')
          .single()
        if (promoted) current = promoted
      } catch (promoteError) {
        console.error(
          'ADMIN_EMAILS matched but auto-promotion failed. Is SUPABASE_SERVICE_ROLE_KEY set?',
          promoteError,
        )
      }
    }
  }

  // Sync DB role into JWT user_metadata so proxy can check without a DB call.
  // This is a lightweight update that prevents the admin reload loop.
  if (current && current.role) {
    const metaRole = user.user_metadata?.role as string | undefined
    if (metaRole !== current.role) {
      try {
        const admin = createAdminClient()
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, role: current.role },
        })
      } catch {
        // Non-critical — proxy falls back to allowing the request through
      }
    }
  }

  return NextResponse.json({
    profile: current
      ? {
          id: current.id,
          email: current.email ?? user.email ?? null,
          name: current.name,
          phone: current.phone,
          role: current.role === 'ADMIN' || current.role === 'SUPER_ADMIN' ? current.role : 'CUSTOMER',
        }
      : null,
    sessionStart: startMs,
  })
}

export async function GET(request: NextRequest) {
  try {
    return await resolveProfile(request, false)
  } catch (error: unknown) {
    console.error('API /api/auth/profile GET error:', error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await resolveProfile(request, true)
  } catch (error: unknown) {
    console.error('API /api/auth/profile POST error:', error)
    return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 })
  }
}
