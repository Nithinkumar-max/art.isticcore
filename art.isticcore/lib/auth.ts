import { createClient } from '@/lib/supabase/server'

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
