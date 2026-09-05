import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { SESSION_TIMEOUT_MS } from '@/lib/session-ttl'

/**
 * Single-session token minting & validation.
 *
 * Each successful sign-in revokes every existing session for the user and
 * mints a fresh opaque token stored in public.user_sessions (1-hour life).
 * The browser mirrors it in an httpOnly cookie. Any request whose cookie is
 * missing, expired, or superseded by a newer login is signed out — so logging
 * in from a phone or another browser invalidates the previous one.
 */

export const SESSION_TOKEN_COOKIE = 'art_session_token'

export function sessionTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TIMEOUT_MS / 1000),
  }
}

/** True when the browser's token is the account's current, unexpired session. */
export async function isSessionValid(userId: string, token?: string): Promise<boolean> {
  if (!token) return false
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (error) {
      console.error('[sessions] validation query failed:', error)
      return false
    }
    return Boolean(data)
  } catch (error) {
    console.error('[sessions] validation failed:', error)
    return false
  }
}

/**
 * Replaces the user's sessions with a brand-new one and returns the token
 * to store in the browser. Superseded browsers become invalid immediately.
 */
export async function establishSession(userId: string): Promise<string> {
  const admin = createAdminClient()
  const token = randomUUID().replace(/-/g, '')
  await admin.from('user_sessions').delete().eq('user_id', userId)
  await admin.from('user_sessions').insert({
    user_id: userId,
    session_token: token,
    expires_at: new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString(),
  })
  return token
}

/** Deletes a specific token (used on logout). */
export async function revokeSession(token?: string): Promise<void> {
  if (!token) return
  try {
    const admin = createAdminClient()
    await admin.from('user_sessions').delete().eq('session_token', token)
  } catch (error) {
    console.error('[sessions] revoke failed:', error)
  }
}

/** Housekeeping: drop expired rows so the table stays tiny. */
export async function pruneExpiredSessions(): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('user_sessions').delete().lt('expires_at', new Date().toISOString())
  } catch (error) {
    console.error('[sessions] prune failed:', error)
  }
}