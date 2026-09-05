import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isSessionValid, SESSION_TOKEN_COOKIE } from '@/lib/services/sessions'

export interface SessionUser {
  id: string
  email: string | undefined
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'
}

/**
 * Returns the session user with their DB-sourced role.
 * Role is read from public.users — NEVER from user_metadata,
 * which clients can edit freely (privilege-escalation fix).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Single-session gate: only the browser holding the account's current
  // (unexpired) session token counts as signed in. Missing / revoked /
  // superseded tokens behave as logged-out — the proxy completes the
  // sign-out+redirect on the next request.
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_TOKEN_COOKIE)?.value
  if (!(await isSessionValid(user.id, token))) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email,
    role: profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' ? profile.role : 'CUSTOMER',
  }
}

export async function isAdmin(): Promise<SessionUser | null> {
  const session = await getSessionUser()
  if (!session || session.role === 'CUSTOMER') return null
  return session
}
