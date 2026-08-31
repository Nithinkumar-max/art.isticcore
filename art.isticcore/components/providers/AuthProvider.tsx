'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const SESSION_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour
const CHECK_INTERVAL_MS = 60 * 1000 // check every minute

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore()
  const loginTimeRef = useRef<number | null>(null)
  const lastSyncRef = useRef<number>(0)

  useEffect(() => {
    const supabase = createClient()

    // Tracks the signed-in user across auth events. Page refreshes keep the
    // same id (carts survive); a genuinely new sign-in gets a clean basket.
    let knownUserId: string | null = null

    // Role/name/phone come from public.users via the server —
    // user_metadata is client-writable and must not be trusted.
    // Debounced: only sync once per 5 seconds to prevent loops.
    const syncFromServer = async () => {
      const now = Date.now()
      if (now - lastSyncRef.current < 5000) return
      lastSyncRef.current = now
      try {
        const res = await fetch('/api/auth/profile')
        if (!res.ok) return
        const body = await res.json()
        const profile = body?.profile as { id: string; email: string | null; name: string | null; phone: string | null; role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' } | null
        if (profile) {
          setUser({ id: profile.id, email: profile.email, name: profile.name, phone: profile.phone, role: profile.role })
        }
      } catch {
        // Offline / not signed in — keep whatever the session gave us.
      }
    }

    // Session timeout check — runs every minute
    const checkSessionTimeout = () => {
      if (!loginTimeRef.current) return
      const elapsed = Date.now() - loginTimeRef.current
      if (elapsed > SESSION_TIMEOUT_MS) {
        // Session expired — force logout
        logout()
        useCartStore.getState().clearCart()
        void supabase.auth.signOut()
        window.location.href = '/login?reason=session_expired'
      }
    }

    // Initial session check — don't reset timer on page refresh,
    // only on actual sign-in events (handled in onAuthStateChange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      knownUserId = session?.user?.id ?? null
      if (session?.user) {
        // Only set login time if not already set (preserves session across refreshes)
        if (!loginTimeRef.current) {
          loginTimeRef.current = Date.now()
        }
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
    })

    // Listen for auth state changes — only sync on genuine sign-in/sign-out,
    // NOT on token refresh (which fires frequently and causes loops).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null

      // A fresh sign-in must never inherit a basket left by a previous
      // visitor/account in localStorage (and drop any stale server rows
      // when switching between accounts).
      if (event === 'SIGNED_IN' && nextUserId && knownUserId !== nextUserId) {
        useCartStore.getState().clearCart()
        if (knownUserId) {
          void fetch('/api/cart', { method: 'DELETE' }).catch(() => {})
        }
        loginTimeRef.current = Date.now()
        // Sync role from DB on actual sign-in
        void syncFromServer()
      }

      if (event === 'SIGNED_OUT') {
        loginTimeRef.current = null
        knownUserId = null
        setUser(null)
        return
      }

      // For TOKEN_REFRESHED and other events, just update the user id
      // without re-syncing from server (prevents infinite loops).
      if (nextUserId && event !== 'SIGNED_IN') {
        knownUserId = nextUserId
        // Update basic info from JWT without hitting the server
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

    return () => {
      subscription.unsubscribe()
      clearInterval(timeoutInterval)
    }
  }, [setUser, setLoading, logout])

  return <>{children}</>
}
