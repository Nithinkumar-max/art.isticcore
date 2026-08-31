'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ReauthModalProps {
  open: boolean
  onClose: () => void
  onVerified: () => void
}

export function ReauthModal({ open, onClose, onVerified }: ReauthModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setPassword('')
      onVerified()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-admin-border bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">Confirm your identity</h3>
          <button type="button" onClick={onClose} className="focus-ring rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">Enter your password to confirm this destructive action.</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="label-caps text-on-surface-variant">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your admin password"
              className="form-input mt-2"
              required
              autoFocus
            />
          </label>
          {error ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-error">{error}</p> : null}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="focus-ring flex-1 rounded-full border-2 border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !password} className="focus-ring flex-1 rounded-full bg-error px-5 py-2.5 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-50">
              {loading ? 'Verifying...' : 'Confirm delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
