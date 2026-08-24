'use client'

import { useQuery } from '@tanstack/react-query'
import type { OrderWithItems } from '@/types'

export function useOrders() {
  return useQuery<OrderWithItems[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error('Failed to load orders')
      return res.json()
    },
  })
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
