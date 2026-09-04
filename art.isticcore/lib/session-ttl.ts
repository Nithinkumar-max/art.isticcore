export const SESSION_COOKIE_NAME = 'art_session_start'
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000 // absolute max logged-in time: 60 minutes
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  }
}