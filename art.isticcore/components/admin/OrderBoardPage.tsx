'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Check, ChevronRight, Clock3, Download, FileText, Hand, Package, RefreshCw, RotateCcw, Search, Trash2, Truck, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { ORDER_STATUS_MAP } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { OrderStatus, OrderWithItems, PaymentStatus } from '@/types'

// ─── Strict State Machine ───────────────────────────────────────────────
// confirmed -> preparing -> ready_for_dispatch -> handed_over
// Our responsibility ends at handover — final delivery is the courier's job.
// handed_over is the terminal stage: no refund step exists.
// cancelled remains the off-board exception; refunded is legacy display only.
type BoardColumn = Exclude<OrderStatus, 'cancelled' | 'refunded'>

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['handed_over', 'cancelled'],
  handed_over: [],
  cancelled: [],
  refunded: [],
}

const columns: Array<{ id: BoardColumn; label: string; sublabel: string; tone: string; progress: number }> = [
  { id: 'confirmed', label: 'Confirmed', sublabel: 'confirmed', tone: 'bg-[#eaf8ee] text-success', progress: 15 },
  { id: 'preparing', label: 'Preparing', sublabel: 'preparing', tone: 'bg-[#fff5df] text-secondary', progress: 55 },
  { id: 'ready_for_dispatch', label: 'Ready for Dispatch', sublabel: 'ready_for_dispatch', tone: 'bg-[#eef5ff] text-[#2a5db0]', progress: 85 },
  { id: 'handed_over', label: 'Handed to Agent', sublabel: 'handed_over', tone: 'bg-[#eaf8ee] text-success', progress: 100 },
]

function columnForStatus(status: OrderStatus): BoardColumn | null {
  if (status === 'cancelled' || status === 'refunded') return null
  return status as BoardColumn
}

const PROGRESS_BY_COLUMN: Record<BoardColumn, number> = Object.fromEntries(columns.map((c) => [c.id, c.progress])) as Record<BoardColumn, number>

interface BoardOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  column: BoardColumn
  productName: string
  itemCount: number
  customerName: string
  customerEmail?: string
  price: number
  progress: number
  note?: string
  paymentLabel: string
  ageLabel: string
  courier?: string
  raw: AdminOrderRow
}

type AdminOrderRow = OrderWithItems & {
  address: { full_name: string; city?: string } | null
  user: { name: string | null; email: string | null; phone: string | null } | null
  items: Array<{ name: string; quantity: number; price: number; product?: { name: string } | null }>
}

type RefundState = 'pending' | 'refunded' | 'partial' | 'none'

// Refund tracking, derived from the payment row (source of truth for the gateway).
function refundState(order: AdminOrderRow | null | undefined): RefundState {
  if (!order || order.status !== 'cancelled') return 'none'
  const status = (order.payment?.status ?? order.payment_status) as PaymentStatus | undefined
  if (status === 'refunded') return 'refunded'
  if (status === 'partially_refunded') return 'partial'
  if (status === 'paid') return 'pending'
  return 'none'
}

const REFUND_STATE_META: Record<Exclude<RefundState, 'none'>, { label: string; className: string }> = {
  pending: { label: 'Refund pending', className: 'bg-[#fff5df] text-secondary border-secondary/30' },
  refunded: { label: 'Refunded', className: 'bg-surface-container text-on-surface-variant border-admin-border' },
  partial: { label: 'Partially refunded', className: 'bg-[#ffeef2] text-error border-error/30' },
}

function RefundBadge({ state }: { state: RefundState }) {
  if (state === 'none') {
    return <span className="rounded-full border border-admin-border px-2.5 py-1 text-[11px] font-bold tracking-wider text-on-surface-variant/70">Not prepaid</span>
  }
  const meta = REFUND_STATE_META[state]
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wider ${meta.className}`}>{meta.label}</span>
}

function PillBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_MAP[status] ?? { label: status, bgColor: 'bg-surface-container', color: 'text-on-surface-variant', dot: 'bg-outline' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider ${meta.bgColor} ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  )
}

export function OrderBoardPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'board' | 'list' | 'cancelled'>('board')
  const [notice, setNotice] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; orderNumber: string; prepaid: boolean } | null>(null)
  const [deleteConfirmTyped, setDeleteConfirmTyped] = useState('')

  const { data, isLoading, isError, isRefetching, refetch } = useQuery<AdminOrderRow[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders')
      if (!res.ok) throw new Error('Could not load orders')
      return res.json()
    },
  })

  const cancelledData = useQuery<AdminOrderRow[]>({
    queryKey: ['admin-orders-cancelled'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders?status=cancelled')
      if (!res.ok) throw new Error('Could not load cancelled orders')
      return res.json()
    },
    enabled: view === 'cancelled',
  })

  const [realtimeState, setRealtimeState] = useState<'connected' | 'connecting' | 'reconnecting'>('connecting')
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const patchLocalStatus = (id: string, status: OrderStatus) => {
    queryClient.setQueryData<AdminOrderRow[]>(['admin-orders'], (current) =>
      (current ?? []).map((order) => (order.id === id ? { ...order, status } : order)),
    )
  }

  const flashNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  // ─── Real-Time Event Bus (Admin) — INSERT + UPDATE on orders ────────────
  // Fixed: single '*' listener before subscribe(), unique channel per mount to avoid StrictMode duplicate.
  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    const adminChannelId = Math.random().toString(36).slice(2, 8)
    // Clean any stale admin channels from HMR/StrictMode
    try {
      supabase.getChannels().forEach((ch) => {
        if (ch.topic.includes('admin-orders-realtime')) supabase.removeChannel(ch)
      })
    } catch {}

    const handleChange = (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const eventType = (payload as unknown as { eventType: string }).eventType
      const row = payload.new as unknown as AdminOrderRow
      if (eventType === 'INSERT') {
        queryClient.setQueryData<AdminOrderRow[]>(['admin-orders'], (curr) => {
          if (!curr) return [row]
          if (curr.some((o) => o.id === row.id)) return curr
          return [row, ...curr]
        })
        flashNotice(`New order ${row.order_number ?? row.id.slice(0, 8)} — Confirmed`)
        void refetch()
      } else if (eventType === 'UPDATE') {
        const oldRow = payload.old as unknown as AdminOrderRow
        queryClient.setQueryData<AdminOrderRow[]>(['admin-orders'], (curr) =>
          (curr ?? []).map((o) => (o.id === row.id ? ({ ...o, ...row } as AdminOrderRow) : o)),
        )
        if (oldRow?.status !== row.status) {
          const meta = ORDER_STATUS_MAP[row.status as string]
          flashNotice(`${row.order_number ?? row.id.slice(0, 8)} → ${meta?.label ?? row.status}`)
        }
      } else if (eventType === 'DELETE') {
        const deletedRow = payload.old as unknown as AdminOrderRow
        queryClient.setQueryData<AdminOrderRow[]>(['admin-orders'], (curr) =>
          (curr ?? []).filter((o) => o.id !== deletedRow.id),
        )
        queryClient.setQueryData<AdminOrderRow[]>(['admin-orders-cancelled'], (curr) =>
          (curr ?? []).filter((o) => o.id !== deletedRow.id),
        )
      }
    }

    const channel = supabase
      .channel(`admin-orders-realtime-${adminChannelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleChange as unknown as () => void)
      .subscribe((status) => {
        if (!mounted) return
        if (status === 'SUBSCRIBED') {
          setRealtimeState('connected')
          if (fallbackRef.current) {
            clearInterval(fallbackRef.current)
            fallbackRef.current = null
          }
          void refetch()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeState('reconnecting')
          if (!fallbackRef.current) {
            fallbackRef.current = setInterval(() => void refetch(), 15000)
          }
        } else {
          setRealtimeState('connecting')
        }
      })

    return () => {
      mounted = false
      try {
        supabase.removeChannel(channel)
      } catch {}
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current)
        fallbackRef.current = null
      }
    }
  }, [queryClient, refetch])

  const orders: BoardOrder[] = useMemo(
    () =>
      (data ?? [])
        .map((order): BoardOrder | null => {
          const column = columnForStatus(order.status as OrderStatus)
          if (!column) return null // cancelled / refunded stay off the board
          const items = (order as unknown as AdminOrderRow).items ?? []
          const productName = items.map((i) => i.name).join(' + ') || 'Custom request'
          const addrName = (order as unknown as AdminOrderRow).address?.full_name
          const userName = (order as unknown as AdminOrderRow).user?.name
          const customerName = addrName || userName || 'Guest customer'
          const customerEmail = (order as unknown as AdminOrderRow).user?.email || undefined
          return {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status as OrderStatus,
            column,
            productName,
            itemCount: items.length,
            customerName,
            customerEmail,
            price: Number(order.total),
            progress: PROGRESS_BY_COLUMN[column],
            note: order.customer_note || undefined,
            paymentLabel: `${order.payment_method} · ${order.payment_status}`,
            ageLabel: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
            courier: order.courier_name || undefined,
            raw: order as unknown as AdminOrderRow,
          }
        })
        .filter((o): o is BoardOrder => Boolean(o)),
    [data],
  )

  const selected = orders.find((o) => o.id === selectedId) ?? null
  // Fallback: if selected is cancelled/refunded not in board, fabricate a full
  // BoardOrder from the raw row so the drawer (and refund tracking) works.
  const selectedOrderRaw = useMemo(() => {
    if (selected) return selected
    const raw = ((data ?? []).concat(cancelledData.data ?? []).find((o) => o.id === selectedId)) as unknown as AdminOrderRow | undefined
    if (!raw) return null
    const col = columnForStatus(raw.status as OrderStatus)
    const items = raw.items ?? []
    const productName = items.map((i) => i.name).join(' + ') || 'Custom request'
    return {
      id: raw.id,
      orderNumber: raw.order_number,
      status: raw.status as OrderStatus,
      column: (col ?? 'confirmed') as BoardColumn,
      productName,
      itemCount: items.length,
      customerName: raw.address?.full_name || raw.user?.name || 'Guest customer',
      customerEmail: raw.user?.email || undefined,
      price: Number(raw.total),
      progress: col ? (PROGRESS_BY_COLUMN[col] ?? 0) : 0,
      note: raw.customer_note || undefined,
      paymentLabel: `${raw.payment_method} · ${raw.payment_status}`,
      ageLabel: formatDistanceToNow(new Date(raw.created_at), { addSuffix: true }),
      courier: raw.courier_name || undefined,
      raw,
    } as BoardOrder
  }, [selected, data, cancelledData.data, selectedId])

  const selectedRaw = selectedOrderRaw?.raw as unknown as AdminOrderRow | undefined
  const selectedPrepaid = selectedRaw
    ? ['paid', 'refunded', 'partially_refunded'].includes(String(selectedRaw.payment?.status ?? selectedRaw.payment_status))
    : false

  const visible = useMemo(
    () => orders.filter((o) => `${o.orderNumber} ${o.productName} ${o.customerName}`.toLowerCase().includes(search.toLowerCase())),
    [orders, search],
  )

  const stats: Array<[string, string]> = columns.map((c) => [c.label, String(orders.filter((o) => o.column === c.id).length)])

  const cancelledOrders: AdminOrderRow[] = useMemo(
    () =>
      (cancelledData.data ?? [])
        .filter((o) => `${o.order_number} ${o.customer_note ?? ''} ${o.address?.full_name ?? ''} ${o.user?.name ?? ''}`.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [cancelledData.data, search],
  )

  const refundPendingCount = useMemo(() => cancelledOrders.filter((o) => refundState(o) === 'pending').length, [cancelledOrders])

  const moveOrder = async (order: BoardOrder, nextStatus: OrderStatus) => {
    const allowed = VALID_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(nextStatus) && order.status !== nextStatus) {
      flashNotice(`Cannot move ${order.orderNumber}: ${order.status} → ${nextStatus} is not allowed`)
      return
    }
    if (order.status !== nextStatus) patchLocalStatus(order.id, nextStatus)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'move failed')
      flashNotice(`${order.orderNumber} → ${ORDER_STATUS_MAP[nextStatus]?.label ?? nextStatus}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Move failed'
      flashNotice(msg.includes('Invalid status') ? msg : `Could not move ${order.orderNumber}. Try again.`)
    } finally {
      void refetch()
    }
  }

  const cancelOrder = async (order: BoardOrder) => {
    setSelectedId(null)
    patchLocalStatus(order.id, 'cancelled')
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) throw new Error('cancel failed')
      flashNotice(`${order.orderNumber} cancelled.`)
    } catch {
      flashNotice(`Could not cancel ${order.orderNumber}.`)
    } finally {
      void refetch()
    }
  }

  const deleteOrder = async (orderId: string) => {
    setDeleteTarget(null)
    setSelectedId(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      queryClient.setQueryData<AdminOrderRow[]>(['admin-orders'], (curr) => (curr ?? []).filter((o) => o.id !== orderId))
      queryClient.setQueryData<AdminOrderRow[]>(['admin-orders-cancelled'], (curr) => (curr ?? []).filter((o) => o.id !== orderId))
      flashNotice('Order deleted permanently.')
      void refetch()
    } catch {
      flashNotice('Could not delete the order. Try again.')
    }
  }

  const markRefunded = async (orderId: string, refunded: boolean) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refunded }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'update failed')
      const paymentStatus: PaymentStatus = refunded ? 'refunded' : 'paid'
      queryClient.setQueryData<AdminOrderRow[]>(['admin-orders-cancelled'], (curr) =>
        (curr ?? []).map((o) =>
          o.id === orderId
            ? {
                ...o,
                payment_status: paymentStatus as AdminOrderRow['payment_status'],
                payment: o.payment ? { ...o.payment, status: paymentStatus } : o.payment,
              }
            : o,
        ),
      )
      flashNotice(refunded ? 'Refund marked as done.' : 'Refund status reverted to paid.')
      void refetch()
    } catch (e: unknown) {
      flashNotice(e instanceof Error ? e.message : 'Could not update refund status.')
    }
  }

  const downloadDocument = async (orderId: string, type: 'invoice' | 'packing' | 'label' | 'all') => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/documents?type=${type}`)
      if (!res.ok) throw new Error('document fetch failed')
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const fileMatch = disposition.match(/filename="([^"]+)"/)
      const filename = fileMatch?.[1] ?? `${type}-${orderId}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      flashNotice('Could not generate the document. Try again.')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-background-warm px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-primary">Daily operations — Artisanal Grace</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-on-surface">Order management</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">
              Every order queried live from <span className="font-mono text-xs">orders</span> joined with{' '}
              <span className="font-mono text-xs">order_items</span> & <span className="font-mono text-xs">profiles</span>. Pill badges, warm cream, EB Garamond.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView('board')}
              className={`focus-ring flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm ${view === 'board' ? 'border-primary bg-surface text-primary soft-shadow' : 'border-admin-border bg-surface text-on-surface-variant'}`}
            >
              <Package className="h-4 w-4" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`focus-ring flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm ${view === 'list' ? 'border-primary bg-surface text-primary soft-shadow' : 'border-admin-border bg-surface text-on-surface-variant'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView('cancelled')}
              className={`focus-ring flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm ${view === 'cancelled' ? 'border-primary bg-surface text-primary soft-shadow' : 'border-admin-border bg-surface text-on-surface-variant'}`}
            >
              <X className="h-4 w-4" />
              Cancelled
              {view === 'cancelled' && refundPendingCount > 0 ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-white" title={`${refundPendingCount} prepaid order${refundPendingCount === 1 ? '' : 's'} awaiting refund`}>
                  {refundPendingCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="focus-ring flex min-h-10 items-center gap-2 rounded-full border border-admin-border bg-surface px-4 text-sm text-on-surface-variant hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          {columns.map((c) => {
            const count = orders.filter((o) => o.column === c.id).length
            return (
              <div key={c.id} className="rounded-2xl border border-admin-border bg-surface px-4 py-4 admin-shadow">
                <p className="text-xs font-medium tracking-wide text-on-surface-variant">{c.label}</p>
                <p className="mt-1 font-serif text-3xl font-semibold text-primary">{count}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-outline">{c.sublabel}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders, customers, items..."
              className="focus-ring w-full rounded-full border border-admin-border bg-surface px-11 py-3 text-sm placeholder:text-on-surface-variant/60"
            />
          </div>
          {/* Realtime connection indicator — graceful degradation */}
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${realtimeState === 'connected' ? 'border-success/30 bg-[#eaf8ee] text-success' : realtimeState === 'reconnecting' ? 'border-warning/30 bg-[#fff5df] text-secondary' : 'border-admin-border bg-surface text-on-surface-variant'}`} title="Supabase Realtime">
            <span className={`h-2 w-2 rounded-full ${realtimeState === 'connected' ? 'bg-success animate-pulse' : realtimeState === 'reconnecting' ? 'bg-warning animate-pulse' : 'bg-outline animate-pulse'}`} />
            {realtimeState === 'connected' ? 'Live' : realtimeState === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="focus-ring rounded-full border border-admin-border bg-surface p-3 text-on-surface-variant hover:border-primary hover:text-primary"
            aria-label="Refresh orders"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="mt-6 grid min-h-[480px] gap-4 lg:grid-cols-4 xl:grid-cols-7">
            {columns.map((c) => (
              <div key={c.id} className="rounded-2xl bg-surface-container-low p-3">
                <div className={`mb-3 h-10 animate-pulse rounded-xl ${c.tone.split(' ')[0]}`} aria-hidden="true" />
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface admin-shadow" aria-hidden="true" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-admin-border bg-surface p-8 text-center soft-shadow">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background-soft-pink text-primary">
              <Package className="h-7 w-7" />
            </div>
            <p className="mt-4 font-serif text-2xl font-semibold">Could not load orders</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">We query orders joined with order_items & profiles live. Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="focus-ring mt-5 rounded-full bg-primary-container px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-dark"
            >
              Retry
            </button>
          </div>
        ) : view === 'cancelled' ? (
          cancelledData.isLoading ? (
            <div className="mt-6 grid min-h-[320px] gap-4 lg:grid-cols-4 xl:grid-cols-7">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface-container-low admin-shadow" aria-hidden="true" />
              ))}
            </div>
          ) : !cancelledOrders.length ? (
            <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-dashed border-admin-border bg-surface p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background-soft-pink text-primary">
                <X className="h-7 w-7" />
              </div>
              <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">No cancelled orders</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
                Cancelled prepaid orders appear here with a <em className="font-serif">Refund pending</em> badge so you can reconcile refunds in the Razorpay dashboard.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-3xl border border-admin-border bg-surface admin-shadow">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-surface-container-low px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-bg-secondary/40 bg-surface px-3 py-1.5 text-xs font-bold text-secondary">Refund pending: {refundPendingCount}</span>
                  <span className="rounded-full border border-admin-border bg-surface px-3 py-1.5 text-xs font-bold text-on-surface-variant">Total cancelled: {cancelledOrders.length}</span>
                </div>
                <p className="text-xs text-on-surface-variant">Refunds are processed in the Razorpay dashboard — mark them done here to reconcile.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="border-b border-admin-border bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Order</th>
                      <th className="px-5 py-4 font-semibold">Customer</th>
                      <th className="px-5 py-4 font-semibold">Item</th>
                      <th className="px-5 py-4 font-semibold">Total</th>
                      <th className="px-5 py-4 font-semibold">Refund</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {cancelledOrders.map((order) => {
                      const state = refundState(order)
                      const customerText = order.address?.full_name || order.user?.name || 'Guest customer'
                      const itemText = (order.items ?? []).map((i) => i.name).join(' + ') || 'Custom request'
                      return (
                        <tr key={order.id} className="hover:bg-background-warm/60">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">#{order.order_number}</span>
                              <PillBadge status="cancelled" />
                            </div>
                            <span className="mt-1 block text-[10px] uppercase tracking-wider text-on-surface-variant">{formatDistanceToNow(new Date(order.updated_at ?? order.created_at), { addSuffix: true })}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-medium">{customerText}</span>
                            {order.user?.email ? <span className="block text-xs text-on-surface-variant">{order.user.email}</span> : null}
                          </td>
                          <td className="px-5 py-4">
                            <span className="line-clamp-1">{itemText}</span>
                            <span className="text-xs text-on-surface-variant">{order.items?.length ?? 0} line item{(order.items?.length ?? 0) === 1 ? '' : 's'} · {order.payment_method}</span>
                          </td>
                          <td className="px-5 py-4 font-serif font-semibold">{formatPrice(Number(order.total))}</td>
                          <td className="px-5 py-4">
                            <RefundBadge state={state} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {state === 'pending' ? (
                                <button
                                  type="button"
                                  onClick={() => void markRefunded(order.id, true)}
                                  className="focus-ring inline-flex items-center gap-1 rounded-full border border-success/40 bg-[#eaf8ee] px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10"
                                  title="Mark this prepaid order as refunded (process the refund in Razorpay first)"
                                >
                                  <Check className="h-3.5 w-3.5" /> Mark refunded
                                </button>
                              ) : state === 'refunded' ? (
                                <button
                                  type="button"
                                  onClick={() => void markRefunded(order.id, false)}
                                  className="focus-ring inline-flex items-center gap-1 rounded-full border border-admin-border bg-surface px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary"
                                  title="Revert refund status (mistake correction)"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" /> Undo
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setSelectedId(order.id)}
                                className="focus-ring inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
                              >
                                View <ChevronRight className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ id: order.id, orderNumber: order.order_number, prepaid: state !== 'none' })}
                                className="focus-ring rounded-full p-2 text-error/70 hover:bg-[#fff0f0] hover:text-error"
                                title="Delete this order permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : !orders.length ? (
          <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-dashed border-admin-border bg-surface p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background-soft-pink text-primary">
              <Package className="h-7 w-7" />
            </div>
            <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">No orders yet</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              Orders land here the moment checkout completes. Pill badges will show <em className="font-serif">Confirmed → Preparing → Ready for Dispatch → Handed to Delivery Agent</em>
            </p>
            <p className="mt-3 font-mono text-xs text-outline">orders · order_items · profiles — live, no mocks</p>
          </div>
        ) : view === 'board' ? (
          <div className="kanban-scroll mt-6 flex min-h-[520px] gap-4 overflow-x-auto pb-4">
            {columns.map((column) => {
              const columnOrders = visible.filter((o) => o.column === column.id)
              return (
                <section key={column.id} className="flex w-[min(88vw,310px)] min-w-[min(88vw,310px)] flex-col rounded-2xl bg-surface-container-low p-3">
                  <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2.5 ${column.tone}`}>
                    <h3 className="font-serif text-sm font-semibold tracking-tight">{column.label}</h3>
                    <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold">{columnOrders.length}</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    {columnOrders.map((order) => (
                      <OrderCard key={order.id} order={order} onOpen={() => setSelectedId(order.id)} onMove={(next) => void moveOrder(order, next)} onCancel={() => void cancelOrder(order)} />
                    ))}
                    {columnOrders.length === 0 ? (
                      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-admin-border bg-surface/60 px-3 py-6 text-center text-xs leading-relaxed text-on-surface-variant">
                        No orders in <span className="font-serif font-semibold">{column.label}</span>
                      </div>
                    ) : null}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl border border-admin-border bg-surface admin-shadow">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-admin-border bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Order</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Item</th>
                    <th className="px-5 py-4 font-semibold">Total</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visible.map((order) => (
                    <tr key={order.id} className="hover:bg-background-warm/60">
                      <td className="px-5 py-4 font-mono text-xs">#{order.orderNumber}</td>
                      <td className="px-5 py-4">
                        <span className="font-medium">{order.customerName}</span>
                        {order.customerEmail ? <span className="block text-xs text-on-surface-variant">{order.customerEmail}</span> : null}
                      </td>
                      <td className="px-5 py-4">
                        <span className="line-clamp-1">{order.productName}</span>
                        <span className="text-xs text-on-surface-variant">{order.itemCount} line items</span>
                      </td>
                      <td className="px-5 py-4 font-serif font-semibold">{formatPrice(order.price)}</td>
                      <td className="px-5 py-4">
                        <PillBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => setSelectedId(order.id)} className="focus-ring inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
                          View <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {notice ? (
          <p role="status" className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-admin-sidebar px-5 py-3 text-xs font-semibold tracking-wide text-white shadow-xl">
            {notice}
          </p>
        ) : null}
      </div>

      {/* Hard-delete confirmation — typed order number required */}
      <AnimatePresence>
        {deleteTarget ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              aria-label="Cancel delete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full max-w-md rounded-3xl border border-admin-border bg-surface p-6 soft-shadow sm:p-7"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff0f0] text-error">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-semibold tracking-tight">Delete order #{deleteTarget.orderNumber}?</h3>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                    This permanently removes the order, its items and payment record. This cannot be undone.
                  </p>
                </div>
              </div>

              {deleteTarget.prepaid ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-[#fff5df] px-4 py-3 text-xs leading-relaxed text-secondary">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    This order was <strong>prepaid</strong>. Make sure the refund has been processed in the Razorpay dashboard before deleting — this record is your proof of payment.
                  </span>
                </div>
              ) : null}

              <label className="mt-5 block text-xs font-medium text-on-surface-variant">
                Type <span className="font-mono font-semibold text-error">#{deleteTarget.orderNumber}</span> to confirm
                <input
                  value={deleteConfirmTyped}
                  onChange={(e) => setDeleteConfirmTyped(e.target.value)}
                  placeholder={deleteTarget.orderNumber}
                  autoFocus
                  className="focus-ring mt-2 w-full rounded-xl border border-admin-border bg-background-warm px-4 py-2.5 font-mono text-sm"
                />
              </label>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null)
                    setDeleteConfirmTyped('')
                  }}
                  className="focus-ring flex min-h-11 flex-1 items-center justify-center rounded-full border border-admin-border bg-surface text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
                >
                  Keep order
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmTyped.trim().toLowerCase() !== deleteTarget.orderNumber.toLowerCase()}
                  onClick={() => void deleteOrder(deleteTarget.id)}
                  className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-error px-3 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOrderRaw ? (
          <div className="fixed inset-0 z-50">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
              aria-label="Close order details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-surface p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-caps text-primary">Order details — Artisanal Grace</p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">#{selectedOrderRaw.orderNumber}</h2>
                  <div className="mt-3">
                    <PillBadge status={selectedOrderRaw.status} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="focus-ring rounded-full bg-surface-container-low p-2 text-on-surface-variant hover:bg-surface-container"
                  aria-label="Close order details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-8 rounded-2xl bg-background-warm p-5">
                <p className="font-serif text-lg font-semibold leading-tight">{selectedOrderRaw.productName}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{selectedOrderRaw.customerName}</p>
                {selectedOrderRaw.customerEmail ? <p className="text-xs text-on-surface-variant">{selectedOrderRaw.customerEmail}</p> : null}
                <p className="mt-4 font-serif text-3xl font-semibold text-primary">{formatPrice(selectedOrderRaw.price)}</p>
                <p className="mt-2 text-xs text-on-surface-variant">{selectedOrderRaw.ageLabel} · {selectedOrderRaw.itemCount ?? ''} items</p>
              </div>

              {/* Line items — dynamic from order_items join */}
              {(() => {
                const items = (selectedOrderRaw?.raw as unknown as AdminOrderRow | undefined)?.items ?? []
                if (!items.length) return null
                return (
                  <div className="mt-6">
                    <h3 className="font-serif text-lg font-semibold">Line items</h3>
                    <ul className="mt-3 divide-y divide-admin-border overflow-hidden rounded-2xl border border-admin-border bg-surface">
                      {items.map((it, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                          <span className="min-w-0 flex-1 truncate">{it.name}</span>
                          <span className="shrink-0 text-xs text-on-surface-variant">× {it.quantity}</span>
                          <span className="shrink-0 font-medium">{formatPrice(it.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              <div className="mt-6 space-y-4">
                <DetailRow icon={Clock3} label="Current stage" value={`${ORDER_STATUS_MAP[selectedOrderRaw.status]?.label ?? selectedOrderRaw.status} · ${selectedOrderRaw.ageLabel}`} />
                <DetailRow icon={Hand} label="Payment" value={selectedOrderRaw.paymentLabel} />
                <DetailRow icon={Truck} label="Courier" value={selectedOrderRaw.courier ?? 'Assign before dispatch'} />
              </div>

              {selectedOrderRaw.note ? <p className="mt-6 rounded-xl bg-surface-container-low px-4 py-3 text-xs leading-relaxed text-on-surface-variant">Note: {selectedOrderRaw.note}</p> : null}

              {selectedOrderRaw.status === 'cancelled' ? (
                <div className="mt-8">
                  <h3 className="font-serif text-xl font-semibold">Refund tracking</h3>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Refunds are processed in the Razorpay dashboard. Mark it done here so the cancelled ledger reflects reality.</p>
                  <div className="mt-4 rounded-2xl border border-admin-border bg-background-warm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-on-surface-variant">Payment</p>
                        <p className="mt-0.5 font-medium">{selectedOrderRaw.paymentLabel}</p>
                      </div>
                      <RefundBadge state={refundState(selectedOrderRaw?.raw as AdminOrderRow)} />
                    </div>
                    {(() => {
                      const state = refundState(selectedOrderRaw?.raw as AdminOrderRow)
                      if (state === 'pending') {
                        return (
                          <button
                            type="button"
                            onClick={() => void markRefunded(selectedOrderRaw.id, true)}
                            className="focus-ring mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-success py-2 text-sm font-bold text-white hover:opacity-90"
                          >
                            <Check className="h-4 w-4" /> Mark refunded
                          </button>
                        )
                      }
                      if (state === 'refunded') {
                        return (
                          <button
                            type="button"
                            onClick={() => void markRefunded(selectedOrderRaw.id, false)}
                            className="focus-ring mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-admin-border bg-surface py-2 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary"
                          >
                            <RotateCcw className="h-4 w-4" /> Undo — back to refund pending
                          </button>
                        )
                      }
                      return <p className="mt-4 rounded-xl bg-surface-container-low px-4 py-3 text-center text-xs text-on-surface-variant">No prepaid payment to refund</p>
                    })()}
                  </div>
                  <p className="mt-3 rounded-xl bg-surface-container-low px-4 py-3 text-xs leading-relaxed text-on-surface-variant">
                    This order is terminal and can't be moved. Delete it only if it's a duplicate/test entry — prepaid records are also your proof of payment for refunds.
                  </p>
                </div>
              ) : (
                <div className="mt-8">
                  <h3 className="font-serif text-xl font-semibold">Move order</h3>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Only valid next states are shown. Invalid jumps (e.g. confirmed → handed_over) are blocked by DB & API. Transitions auto-log to status_history.</p>
                  <div className="mt-4 grid gap-2">
                    {(() => {
                      const valid = VALID_TRANSITIONS[selectedOrderRaw.status] ?? []
                      if (!valid.length) {
                        return <p className="rounded-xl bg-surface-container-low px-4 py-3 text-center text-xs text-on-surface-variant">No further moves — terminal state</p>
                      }
                      return valid.map((next) => {
                        const meta = ORDER_STATUS_MAP[next]
                        const isCurrent = selectedOrderRaw.status === next
                        return (
                          <button
                            key={next}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => void moveOrder(selectedOrderRaw, next)}
                            className="focus-ring flex min-h-11 items-center justify-between rounded-full border border-admin-border bg-surface px-4 text-left text-sm transition hover:border-primary hover:text-primary disabled:bg-surface-container-low disabled:text-on-surface-variant"
                          >
                            <span className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${meta?.dot ?? 'bg-outline'}`} />
                              {meta?.label ?? next}
                            </span>
                            {isCurrent ? <Check className="h-4 w-4 text-success" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )
                      })
                    })()}
                  </div>
                  {/* Visual stepper */}
                  <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-2">
                    {columns.map((c, idx) => {
                      const isActive = c.id === selectedOrderRaw.status
                      const isPast = columns.findIndex((x) => x.id === selectedOrderRaw.status) > idx
                      return (
                        <div key={c.id} className="flex items-center gap-1.5">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${isActive ? 'bg-primary text-white' : isPast ? 'bg-success text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                            {isPast ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                          </span>
                          <span className={`hidden text-[10px] font-medium sm:inline ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{c.label}</span>
                          {idx < columns.length - 1 ? <span className="mx-1 h-px w-4 bg-admin-border" /> : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-auto space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void downloadDocument(selectedOrderRaw.id, 'invoice')} className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/40 bg-background-soft-pink px-3 text-[13px] font-semibold text-primary hover:bg-primary-fixed/60">
                    <FileText className="h-4 w-4" />Invoice
                  </button>
                  <button type="button" onClick={() => void downloadDocument(selectedOrderRaw.id, 'packing')} className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/40 bg-background-soft-pink px-3 text-[13px] font-semibold text-primary hover:bg-primary-fixed/60">
                    <Package className="h-4 w-4" />Packing slip
                  </button>
                  <button type="button" onClick={() => void downloadDocument(selectedOrderRaw.id, 'label')} className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/40 bg-background-soft-pink px-3 text-[13px] font-semibold text-primary hover:bg-primary-fixed/60">
                    <Truck className="h-4 w-4" />Shipping label
                  </button>
                  <button type="button" onClick={() => void downloadDocument(selectedOrderRaw.id, 'all')} className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-container px-3 text-[13px] font-bold text-white pink-glow hover:bg-primary-dark">
                    <Download className="h-4 w-4" />Print all
                  </button>
                </div>
                {selectedOrderRaw.status === 'cancelled' || selectedOrderRaw.status === 'handed_over' ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: selectedOrderRaw.id, orderNumber: selectedOrderRaw.orderNumber, prepaid: selectedPrepaid })}
                    className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-error/30 bg-[#fff0f0] px-3 text-sm font-semibold text-error hover:bg-error/10"
                  >
                    <Trash2 className="h-4 w-4" /> Delete order permanently
                  </button>
                ) : null}
                <button type="button" onClick={() => setSelectedId(null)} className="focus-ring flex min-h-12 w-full items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark">
                  Done
                </button>
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function OrderCard({ order, onOpen, onMove, onCancel }: { order: BoardOrder; onOpen: () => void; onMove: (next: OrderStatus) => void; onCancel: () => void }) {
  const validNext = VALID_TRANSITIONS[order.status] ?? []
  // Prefer forward progression, else first valid forward that isn't cancelled
  const forward = validNext.find((s) => s !== 'cancelled' && s !== 'refunded') ?? validNext[0] ?? null
  const isTerminal = validNext.length === 0
  return (
    <article className="rounded-2xl border border-admin-border bg-surface p-4 admin-shadow transition hover:-translate-y-0.5 hover:border-primary-fixed-dim">
      <button type="button" className="block w-full text-left" onClick={onOpen}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-on-surface-variant">#{order.orderNumber}</span>
          <PillBadge status={order.status} />
        </div>
        <div className="mt-4">
          <h4 className="line-clamp-1 font-serif text-base font-semibold leading-tight">{order.productName}</h4>
          <p className="mt-1 text-xs text-on-surface-variant">{order.customerName} · {order.itemCount} items</p>
          <p className="mt-1 font-serif text-lg font-semibold text-primary-container">{formatPrice(order.price)}</p>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            <span>Progress</span>
            <span>{order.progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full rounded-full bg-primary-container transition-all" style={{ width: `${order.progress}%` }} />
          </div>
        </div>
        {order.note ? <p className="mt-4 line-clamp-2 rounded-xl bg-background-warm px-3 py-2 text-xs leading-relaxed text-on-surface-variant">{order.note}</p> : null}
        <p className="mt-3 text-[10px] uppercase tracking-wider text-on-surface-variant">{order.ageLabel} · {order.paymentLabel}</p>
      </button>
      {!isTerminal && forward ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onMove(forward)}
            className="focus-ring w-full rounded-full border border-primary-container bg-surface py-2 text-xs font-semibold text-primary hover:bg-background-soft-pink"
          >
            Move to {ORDER_STATUS_MAP[forward]?.label ?? forward}
          </button>
        </div>
      ) : null}
    </article>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-soft-pink text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
