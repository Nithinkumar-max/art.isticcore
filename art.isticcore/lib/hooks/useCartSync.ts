'use client'

import { useEffect, useRef } from 'react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'

export function useCartSync() {
  const user = useAuthStore((state) => state.user)
  const items = useCartStore((state) => state.items)
  const isInitialSync = useRef(false)

  useEffect(() => {
    if (!user || items.length === 0) return

    // Sync to backend whenever cart items change
    const syncTimeout = setTimeout(async () => {
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              customNote: i.customNote || null,
            })),
          }),
        })
      } catch (err) {
        console.error('Failed to sync cart with backend:', err)
      }
    }, 800)

    return () => clearTimeout(syncTimeout)
  }, [user, items])
}
