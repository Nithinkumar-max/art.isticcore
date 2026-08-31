'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OrderWithItems } from '@/types'

export function useOrders() {
  const queryClient = useQueryClient()
  const [realtimeState, setRealtimeState] = useState<'connected' | 'connecting' | 'reconnecting'>('connecting')
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const query = useQuery<OrderWithItems[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error('Failed to load orders')
      return res.json()
    },
  })

  // ── Real-Time Event Bus (User) — filtered by user_id ──────────────────
  // Fix: Supabase realtime does not allow adding postgres_changes after subscribe().
  // We must chain all .on() before .subscribe() and avoid reusing a subscribed channel name
  // in React StrictMode double-mount. Each mount gets a unique channel instance that is
  // removed on cleanup. Combined INSERT+UPDATE into single '*' listener to reduce channels.
  useEffect(() => {
    let mounted = true
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    // Unique suffix prevents "cannot add callbacks after subscribe" when StrictMode remounts
    const channelId = Math.random().toString(36).slice(2, 8)

    const setup = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (mounted) setRealtimeState('connected')
        return
      }

      // Remove any stale channels with same base name (StrictMode / HMR leftover)
      try {
        supabase.getChannels().forEach((ch) => {
          if (ch.topic.includes(`user-orders-${user.id}`)) supabase.removeChannel(ch)
        })
      } catch {}

      const handler = (payload: { eventType: string; new: unknown }) => {
        const eventType = (payload as unknown as { eventType: string }).eventType
        if (eventType === 'UPDATE') {
          const updated = (payload as unknown as { new: OrderWithItems }).new
          queryClient.setQueryData<OrderWithItems[]>(['orders'], (curr) =>
            (curr ?? []).map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
          )
          queryClient.setQueryData<OrderWithItems>(['order', updated.id], (curr) => (curr ? { ...curr, ...updated } : curr))
        }
        void queryClient.invalidateQueries({ queryKey: ['orders'] })
      }

      channel = supabase
        .channel(`user-orders-${user.id}-${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
          handler as unknown as () => void,
        )
        .subscribe((status) => {
          if (!mounted) return
          if (status === 'SUBSCRIBED') {
            setRealtimeState('connected')
            if (fallbackRef.current) {
              clearInterval(fallbackRef.current)
              fallbackRef.current = null
            }
            void queryClient.invalidateQueries({ queryKey: ['orders'] })
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setRealtimeState('reconnecting')
            if (!fallbackRef.current) {
              fallbackRef.current = setInterval(() => void queryClient.invalidateQueries({ queryKey: ['orders'] }), 15000)
            }
          } else {
            setRealtimeState('connecting')
          }
        })
    }

    void setup()

    return () => {
      mounted = false
      if (channel) {
        try {
          createClient().removeChannel(channel)
        } catch {}
      }
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current)
        fallbackRef.current = null
      }
    }
  }, [queryClient])

  return { ...query, realtimeState }
}

export function useOrderDetail(orderId: string, initialData?: OrderWithItems) {
  return useQuery<OrderWithItems>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('Order not found')
      return res.json()
    },
    initialData,
    enabled: !!orderId,
  })
}
