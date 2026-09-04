'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function AdminLoginForm() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid admin email address.')
      return
    }
    if (!password) {
      setError('Enter your admin password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setError(body?.error || 'Could not sign you in. Try again.')
        return
      }
      // Bubble the admin profile into the client auth store so AdminShell
      // doesn't bounce us back to login while its server sync catches up.
      setUser({ id: '', email: cleanEmail, name: null, phone: null, role: 'ADMIN' })
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Network problem while signing in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 rounded-3xl border border-admin-border bg-surface p-6 shadow-xl sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-admin-sidebar text-primary-fixed">
        <LockKeyhole className="h-5 w-5" />
      </div>
      <p className="label-caps mt-5 text-primary">Restricted area</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Admin sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
        Sign in with your studio credentials. Customer accounts are not accepted here.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="mt-7 space-y-4"
      >
        <label className="block">
          <span className="label-caps text-on-surface-variant">Admin email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="username"
            placeholder="admin@artisticcore.in"
            className="focus-ring mt-2 min-h-12 w-full rounded-full border border-admin-border bg-surface px-5 text-sm outline-none placeholder:text-outline focus:border-primary-container"
          />
        </label>
        <label className="block">
          <span className="label-caps text-on-surface-variant">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="Your admin password"
            className="focus-ring mt-2 min-h-12 w-full rounded-full border border-admin-border bg-surface px-5 text-sm outline-none placeholder:text-outline focus:border-primary-container"
          />
        </label>
        {error ? (
          <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="focus-ring flex min-h-14 w-full items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60"
        >
          {busy ? 'Signing in...' : 'Sign in to Studio'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-on-surface-variant">
        Sessions auto-sign-out after 60&nbsp;minutes for security.
        <br />
        <Link href="/" className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark">
          Need a customer account? Go to the storefront
        </Link>
      </p>
    </div>
  )
}