'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Clock, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { SESSION_TIMEOUT_MS } from '@/lib/session-ttl'

export default function AdminSettingsRoute() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const start = typeof body?.sessionStart === 'number' && Number.isFinite(body.sessionStart) ? body.sessionStart : null
        if (start) setExpiresAt(start + SESSION_TIMEOUT_MS)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const minsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 60000)) : null

  const handleLogout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
      router.replace('/admin/login')
      router.refresh()
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="bg-admin-canvas px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="label-caps text-primary">Workspace preferences</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Settings</h1>

        {/* Admin profile */}
        <section className="mt-8 rounded-3xl border border-admin-border bg-surface p-6 admin-shadow sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary-fixed text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-xl font-semibold">{user?.name || 'Store admin'}</p>
              <p className="flex items-center gap-1.5 truncate text-sm text-on-surface-variant">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user?.email || '—'}</span>
              </p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-admin-border bg-background-warm p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-on-surface-variant"><KeyRound className="h-3.5 w-3.5" />Role</dt>
              <dd className="mt-1.5 text-sm font-semibold">{user?.role ?? 'ADMIN'}</dd>
            </div>
            <div className="rounded-2xl border border-admin-border bg-background-warm p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-on-surface-variant"><ShieldCheck className="h-3.5 w-3.5" />Access</dt>
              <dd className="mt-1.5 text-sm font-semibold">Full management portal</dd>
            </div>
          </dl>
        </section>

        {/* Session security */}
        <section className="mt-6 rounded-3xl border border-admin-border bg-surface p-6 admin-shadow sm:p-8">
          <p className="label-caps text-primary">Session security</p>
          <div className="mt-4 flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Automatic sign-out after 60 minutes</p>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                Your admin session expires 60 minutes after sign-in — refreshing the page does not extend it.
                {minsLeft !== null ? (
                  <>
                    {' '}Current session expires in <span className="font-semibold text-primary">{minsLeft}:{Math.max(0, Math.floor(((expiresAt! - now) % 60000) / 1000)).toString().padStart(2, '0')}</span>.
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </section>

        {/* Sign out */}
        <section className="mt-6 rounded-3xl border border-admin-border bg-surface p-6 admin-shadow sm:p-8">
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full bg-error px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />{signingOut ? 'Signing out...' : 'Log out of the Studio'}
          </button>
          <p className="mt-3 text-xs text-on-surface-variant">
            Ends your admin session immediately. You will need to sign in again to manage the Studio.
          </p>
        </section>

        <p className="mt-8 text-xs text-on-surface-variant">
          <Link href="/admin" className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark">← Back to dashboard</Link>
        </p>
      </div>
    </div>
  )
}