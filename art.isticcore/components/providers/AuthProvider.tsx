'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const SESSION_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour, absolute since login
const CHECK_INTERVAL_MS = 60 * 1000 // check every minute
const SYNC_DEBOUNCE_MS = 5000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore()
  const sessionStartRef = useRef<number | null>(null)
  const lastSyncRef = useRef<number>(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let knownUserId: string | null = null
    let sessionReadResolved = false

    // Role/name/phone come from public.users via the server — user_metadata is
    // client-writable and must not be trusted. Debounced to prevent loops.
    const syncFromServer = async () => {
      const now = Date.now()
      if (now - lastSyncRef.current < SYNC_DEBOUNCE_MS) return
      lastSyncRef.current = now
      try {
        const res = await fetch('/api/auth/profile')
        if (!res.ok) return
        const body = await res.json()
        const profile = body?.profile as { id: string; email: string | null; name: string | null; phone: string | null; role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' } | null
        // The server stamps the login time; using it keeps the session bound to
        // when the user actually signed in (refreshing the page does NOT extend it).
        if (typeof body?.sessionStart === 'number' && Number.isFinite(body.sessionStart)) {
          sessionStartRef.current = body.sessionStart
        } else if (profile) {
          sessionStartRef.current = Date.now()
        }
        if (profile) {
          setUser({ id: profile.id, email: profile.email, name: profile.name, phone: profile.phone, role: profile.role })
        }
      } catch {
        // Offline / not signed in — keep whatever the session gave us.
      }
    }

    // Runs every minute; forces logout once the absolute 60-min window passes.
    const checkSessionTimeout = () => {
      if (!sessionStartRef.current) return
      const elapsed = Date.now() - sessionStartRef.current
      if (elapsed > SESSION_TIMEOUT_MS) {
        logout()
        useCartStore.getState().clearCart()
        void fetch('/api/auth/logout', { method: 'POST' }).catch(() => supabase.auth.signOut())
        window.location.href = '/login?reason=session_expired'
      }
    }

    // Initial session check — resolve the persisted session BEFORE subscribing
    // to auth events. Subscribing first lets supabase-js flush a SIGNED_IN event
    // for the persisted session while knownUserId is still null, which the
    // handler below would misread as a brand-new sign-in and wipe the cart.
    supabase.auth.getSession().then(({ data: { session } }) => {
      knownUserId = session?.user?.id ?? null
      sessionReadResolved = true
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          name: session.user.user_metadata?.name ?? null,
          phone: session.user.user_metadata?.phone ?? null,
          role: (session.user.user_metadata?.role as 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN') ?? 'CUSTOMER',
        })
        void syncFromServer().finally(() => setLoading(false))
      } else {
        setLoading(false)
      }

      // ── Listen for auth state changes ──────────────────────────────────────
      // Only sync on genuine sign-in/sign-out, NOT on token refresh (which fires
      // frequently and would cause loops).
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        const nextUserId = session?.user?.id ?? null

        // A fresh sign-in must never inherit a basket left by a previous
        // visitor/account in localStorage (and drop stale server rows when
        // switching accounts). sessionReadResolved guards the mount-time flush.
        if (event === 'SIGNED_IN' && nextUserId && sessionReadResolved && knownUserId !== nextUserId) {
          useCartStore.getState().clearCart()
          if (knownUserId) {
            void fetch('/api/cart', { method: 'DELETE' }).catch(() => {})
          }
          sessionStartRef.current = Date.now()
          void syncFromServer()
        }

        if (event === 'SIGNED_OUT') {
          sessionStartRef.current = null
          knownUserId = null
          setUser(null)
          return
        }

        // TOKEN_REFRESHED and other events — update user id without re-syncing.
        if (nextUserId && event !== 'SIGNED_IN') {
          knownUserId = nextUserId
          setUser({
            id: nextUserId,
            email: session!.user!.email ?? null,
            name: session!.user!.user_metadata?.name ?? null,
            phone: session!.user!.user_metadata?.phone ?? null,
            role: (session!.user!.user_metadata?.role as 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN') ?? 'CUSTOMER',
          })
        } else if (nextUserId && event === 'SIGNED_IN') {
          knownUserId = nextUserId
        }
      })

      // Start session timeout checker
      const timeoutInterval = setInterval(checkSessionTimeout, CHECK_INTERVAL_MS)

      cleanupRef.current = () => {
        subscription.unsubscribe()
        clearInterval(timeoutInterval)
      }
    })

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [setUser, setLoading, logout])

  return <>{children}</>
}