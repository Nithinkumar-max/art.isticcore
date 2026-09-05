'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Heart, LogOut, Package, Pencil, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { formatPrice, ORDER_STATUS_MAP } from '@/lib/utils'
import { StatusPill } from '@/components/storefront/StorefrontPrimitives'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useHydrated } from '@/lib/hooks/useHydrated'
import { useOrders } from '@/lib/hooks/useOrders'
import type { ProductWithRelations } from '@/types'

export function AccountPage({ ordersOnly = false }: { ordersOnly?: boolean }) {
  const router = useRouter()
  const storedUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const clearCart = useCartStore((state) => state.clearCart)
  const hydrated = useHydrated()
  const user = hydrated ? storedUser : null
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'there'
  const name = firstName
  const { data: orderData, realtimeState: ordersRealtime } = useOrders()
  const orders: OrderSummaryVM[] = (orderData ?? []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    createdAt: order.created_at,
    total: order.total,
    title: order.items.map((item) => item.name).join(' + '),
    imageUrl: (order.items[0]?.product as ProductWithRelations | undefined)?.images?.[0]?.url || ORDER_IMAGE_PLACEHOLDER,
  }))
  if (ordersOnly) return <OrdersPage />
  return <main className="page-track pt-28 pb-20"><div className="grid gap-8 lg:grid-cols-[260px_1fr]"><aside className="surface-card h-fit overflow-hidden"><div className="bg-surface-container-low p-6"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary"><UserRound className="h-7 w-7" /></div><h1 className="mt-4 font-serif text-3xl text-primary">My account</h1><p className="text-sm text-on-surface-variant">Hello, {name}!</p><p className="mt-5 text-sm">Artisanal member since 2023</p><p className="text-sm font-semibold text-primary-container">Premium tier</p></div><nav className="space-y-1 p-3" aria-label="Account navigation"><Link href="/account" className="focus-ring flex min-h-11 items-center gap-3 rounded-full bg-primary-container px-4 text-sm font-semibold text-on-primary-container"><UserRound className="h-4 w-4" />My profile</Link><Link href="/account/orders" className="focus-ring flex min-h-11 items-center gap-3 rounded-full px-4 text-sm text-on-surface-variant hover:bg-background-soft-pink hover:text-primary"><Package className="h-4 w-4" />Order history</Link><Link href="/#bestsellers" className="focus-ring flex min-h-11 items-center gap-3 rounded-full px-4 text-sm text-on-surface-variant hover:bg-background-soft-pink hover:text-primary"><Heart className="h-4 w-4" />Saved designs</Link><Link href="/custom-order" className="focus-ring flex min-h-11 items-center gap-3 rounded-full px-4 text-sm text-on-surface-variant hover:bg-background-soft-pink hover:text-primary"><Sparkles className="h-4 w-4" />Care instructions</Link><button type="button" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); logout(); clearCart(); try { sessionStorage.setItem('just-logged-out', '1') } catch {} router.push('/') }} className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-left text-sm text-on-surface-variant hover:bg-background-soft-pink hover:text-primary"><LogOut className="h-4 w-4" />Log out</button></nav></aside><section className="min-w-0"><div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary-container to-primary p-6 text-white sm:p-9"><Sparkles className="absolute -right-4 -top-8 h-40 w-40 opacity-20" /><p className="label-caps text-white/75">Your studio dashboard</p><h2 className="relative mt-3 font-serif text-4xl font-semibold">Welcome back, {name}.</h2><div className="relative mt-7 grid grid-cols-2 gap-2 sm:gap-4">{[['Total orders', String(orders.length)], ['In progress', String(orders.filter((order) => order.status !== 'handed_over' && order.status !== 'cancelled' && order.status !== 'refunded').length)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/25 bg-white/15 p-3 backdrop-blur sm:p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/75">{label}</p><p className="mt-2 font-serif text-3xl font-semibold">{value}</p></div>)}</div></div><div className="mt-10 flex items-end justify-between gap-4"><div><p className="label-caps text-primary">Your handmade journey</p><div className="flex items-center gap-2"><h2 className="mt-2 font-serif text-4xl">Recent orders</h2><span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold tracking-wider ${ordersRealtime === "connected" ? "border-success/30 bg-[#eaf8ee] text-success" : ordersRealtime === "reconnecting" ? "border-warning/30 bg-[#fff5df] text-secondary" : "border-admin-border bg-surface text-on-surface-variant"}`}><span className={`h-1.5 w-1.5 rounded-full ${ordersRealtime === "connected" ? "bg-success" : ordersRealtime === "reconnecting" ? "bg-warning animate-pulse" : "bg-outline"}`} />{ordersRealtime === "connected" ? "Live" : ordersRealtime === "reconnecting" ? "Reconnecting…" : ""}</span></div></div><Link href="/account/orders" className="focus-ring flex items-center gap-1 text-sm text-primary hover:text-primary-dark">View all <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-5 space-y-4">{orders.slice(0, 2).map((order) => <article key={order.id} className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"><img src={order.imageUrl} alt={order.title} className="h-20 w-20 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><p className="label-caps text-on-surface-variant">Order #{order.orderNumber}</p><h3 className="mt-1 font-serif text-2xl">{order.title}</h3><div className="mt-1 flex flex-wrap items-center gap-2"><StatusPill tone={order.status === 'handed_over' ? 'success' : order.status === 'cancelled' || order.status === 'refunded' ? 'neutral' : 'warning'}>{(ORDER_STATUS_MAP[order.status]?.label ?? order.status)}</StatusPill></div></div><div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><span className="font-serif text-2xl">{formatPrice(order.total)}</span><Link href={`/orders/${order.id}`} className="focus-ring rounded-full border-2 border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-background-soft-pink">{order.status === 'handed_over' ? 'Buy again' : 'Track'}</Link></div></article>)}</div><div className="mt-8 grid gap-4 sm:grid-cols-2"><QuickLink icon={ShieldCheck} title="Care guide" copy="Keep each stitch lovely" /><QuickLink icon={Pencil} title="Need a custom piece?" copy="Start a commission" href="/custom-order" /></div></section></div></main>
}

function QuickLink({ icon: Icon, title, copy, href = '#' }: { icon: typeof ShieldCheck; title: string; copy: string; href?: string }) { return <Link href={href} className="focus-ring rounded-2xl border border-surface-container-high bg-surface-container-lowest p-4 transition hover:-translate-y-0.5 hover:shadow-sm"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-on-surface-variant">{copy}</p></Link> }

const ORDER_IMAGE_PLACEHOLDER = '/images/product-placeholder.webp'

interface OrderSummaryVM {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  total: number
  title: string
  imageUrl: string
}

export function OrdersPage() {
  const { data, isLoading, isError, realtimeState } = useOrders()
  const orders: OrderSummaryVM[] = (data ?? []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    createdAt: order.created_at,
    total: order.total,
    title: order.items.map((item) => item.name).join(' + '),
    imageUrl: (order.items[0]?.product as ProductWithRelations | undefined)?.images?.[0]?.url || ORDER_IMAGE_PLACEHOLDER,
  }))
  return <main className="page-track pt-28 pb-20"><div className="mb-8"><p className="label-caps text-primary">Your handmade journey</p><h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">My orders</h1><div className="mt-2 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${realtimeState === "connected" ? "bg-success" : realtimeState === "reconnecting" ? "bg-warning animate-pulse" : "bg-outline"}`} /><span className="text-xs text-on-surface-variant">{realtimeState === "connected" ? "Live — updates instantly" : realtimeState === "reconnecting" ? "Reconnecting… polling fallback active" : "Connecting…"}</span></div><p className="mt-3 text-sm text-on-surface-variant">A quiet record of the pieces we’ve made together.</p></div>{isLoading ? <div className="space-y-4">{[0, 1, 2].map((index) => <div key={index} className="surface-card h-32 animate-pulse bg-surface-container-low" aria-hidden="true" />)}</div> : isError ? <div className="surface-card p-8 text-center"><h2 className="font-serif text-2xl">Could not load orders</h2><p className="mt-2 text-sm text-on-surface-variant">Please refresh the page or try again later.</p></div> : !orders.length ? <div className="surface-card flex min-h-72 flex-col items-center justify-center px-6 text-center"><Package className="h-10 w-10 text-primary" /><h2 className="mt-5 font-serif text-2xl">No orders yet</h2><p className="mt-2 max-w-sm text-sm text-on-surface-variant">When you place an order it will show up here, stitches and all.</p><Link href="/shop" className="focus-ring mt-5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-dark">Start browsing</Link></div> : <div className="space-y-4">{orders.map((order) => <article key={order.id} className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6"><img src={order.imageUrl} alt={order.title} className="h-24 w-24 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><p className="label-caps text-on-surface-variant">Order #{order.orderNumber}</p><h2 className="mt-1 font-serif text-2xl">{order.title}</h2><p className="mt-1 text-sm text-on-surface-variant">Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p><div className="mt-3"><StatusPill tone={order.status === 'handed_over' ? 'success' : order.status === 'cancelled' || order.status === 'refunded' ? 'neutral' : 'warning'}>{(ORDER_STATUS_MAP[order.status]?.label ?? order.status)}</StatusPill></div></div><div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><span className="font-serif text-2xl">{formatPrice(order.total)}</span><Link href={`/orders/${order.id}`} className="focus-ring flex items-center gap-1 rounded-full bg-primary-container px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">View order <ArrowRight className="h-4 w-4" /></Link></div></article>)}</div>}</main>
}
