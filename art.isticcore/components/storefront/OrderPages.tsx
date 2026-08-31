'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, Headphones, Mail, Package, Share2, Smartphone, Truck } from 'lucide-react'
import { formatPrice, ORDER_STATUS_MAP } from '@/lib/utils'
import { useOrders } from '@/lib/hooks/useOrders'
import { useAuthStore } from '@/store/authStore'
import type { OrderWithItems, ProductWithRelations } from '@/types'

const timeline: Array<[string, string, string]> = [
  ['Order Received', 'We\'ve received your commission request — reviewing now.', 'pending_review'],
  ['Accepted', 'Your commission is accepted — our artisans will begin soon.', 'accepted'],
  ['In Progress', 'Our artisans are carefully crocheting your piece.', 'in_progress'],
  ['Finishing', 'Stitching in the final details — almost done.', 'finishing'],
  ['Quality Check', 'Inspecting every stitch for our quality standard.', 'quality_check'],
  ['Ready for Delivery', 'Quality-checked and packed — awaiting courier pickup.', 'ready_for_delivery'],
  ['Delivered', 'Delivered — enjoy your handmade piece!', 'delivered'],
]

const IMAGE_PLACEHOLDER = '/images/product-placeholder.webp'

interface TrackedItemVM { name: string; imageUrl: string; quantity: number; price: number; customNote?: string | null }
export interface TrackedOrderVM {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  estimatedDelivery: string
  items: TrackedItemVM[]
  subtotal: number
  shippingFee: number
  total: number
  addressLines: string[]
  paymentMethod: string
}

function statusToStageIndex(status: string): number {
  const order: Record<string, number> = {
    pending_review: 0,
    accepted: 1,
    in_progress: 2,
    finishing: 3,
    quality_check: 4,
    ready_for_delivery: 5,
    delivered: 6,
    cancelled: -1,
    refunded: -1,
  }
  return order[status] ?? 0
}

function toTrackedOrderVM(order: OrderWithItems): TrackedOrderVM {
  const address = order.address
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    createdAt: order.created_at,
    estimatedDelivery: order.estimated_completion_date
      ? new Date(order.estimated_completion_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : '',
    items: order.items.map((item) => ({
      name: item.name,
      imageUrl: (item.product as ProductWithRelations | undefined)?.images?.[0]?.url || IMAGE_PLACEHOLDER,
      quantity: item.quantity,
      price: item.price,
      customNote: item.custom_note,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee ?? 0,
    total: order.total,
    addressLines: address
      ? [address.full_name, address.line1, address.line2, `${address.city}, ${address.state} ${address.pincode}`]
          .filter((line): line is string => Boolean(line))
      : [],
    paymentMethod: order.payment_method,
  }
}

function TrackingResult({ order }: { order: TrackedOrderVM }) {
  const rawIndex = statusToStageIndex(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'
  const activeIndex = isCancelled ? -1 : rawIndex
  const placedOn = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const statusMeta = ORDER_STATUS_MAP[order.status] ?? { label: order.status, bgColor: 'bg-surface-container', color: 'text-on-surface-variant', dot: 'bg-outline' }
  const progressPct = isCancelled ? 0 : Math.round(((activeIndex + 1) / timeline.length) * 100)

  return (
    <main className="page-track pt-28 pb-20">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-primary">Order #{order.orderNumber}</p>
          <h1 className="mt-2 font-serif text-5xl font-semibold">Track your order</h1>
          <p className="mt-3 text-sm text-on-surface-variant">Placed on {placedOn} · Handcrafted with care</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-wider ${statusMeta.bgColor} ${statusMeta.color}`}>
          <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />{statusMeta.label}
        </span>
      </div>
      {isCancelled ? (
        <div className="mb-6 rounded-2xl border border-error/20 bg-[#fff0f0] px-5 py-4 text-sm text-error">This order was {order.status}. If you need help, contact support.</div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-8">
          <section className="surface-card p-5 sm:p-8">
            <h2 className="font-serif text-3xl">Order status</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Live updates via Realtime — status badge syncs instantly when Admin moves the order.</p>
            <div className="mt-7 space-y-0">
              {timeline.map(([title, description], index) => {
                const active = !isCancelled && index === activeIndex
                const complete = !isCancelled && index < activeIndex
                const dotClass = complete ? 'border-success bg-success text-white' : active ? 'border-primary-container bg-primary-container text-white' : 'border-border-muted bg-surface-container-high'
                const titleClass = active ? 'text-primary-dark' : complete ? 'text-on-surface' : 'text-on-surface-variant'
                return (
                  <div key={title} className="relative flex gap-4 pb-7 last:pb-0">
                    <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${dotClass}`}>
                      {complete ? <Check className="h-3.5 w-3.5" /> : active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </div>
                    {index < timeline.length - 1 ? <div className="absolute left-3 top-6 h-full w-px bg-surface-dim" /> : null}
                    <div className="min-w-0"><h3 className={`text-sm font-medium ${titleClass}`}>{title}</h3><p className="mt-1 text-sm text-on-surface-variant">{description}</p><span className={`label-caps mt-2 block ${active ? 'text-primary-container' : 'text-outline'}`}>{active ? 'Currently active' : complete ? 'Done' : 'Coming next'}</span></div>
                  </div>
                )
              })}
            </div>
          </section>
          <section className="surface-card p-5 sm:p-8">
            <h2 className="font-serif text-3xl">Items in this order</h2>
            <div className="mt-5 divide-y divide-surface-container-high">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium">{item.name}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">Qty: {item.quantity}</p>
                    {item.customNote ? <p className="mt-1 text-xs text-on-surface-variant italic">Note: {item.customNote}</p> : null}
                  </div>
                  <span className="font-serif text-xl">{formatPrice(item.price)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="flex flex-col items-start justify-between gap-4 border border-outline-variant bg-background-soft-pink p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-center gap-3"><Headphones className="h-6 w-6 text-primary-container" /><div><h3 className="text-sm font-medium">Need help with your order?</h3><p className="text-sm text-on-surface-variant">We&apos;re here to answer any questions.</p></div></div>
            <a href="mailto:hello@artisticcore.in" className="focus-ring rounded-full border-2 border-primary-container px-5 py-2.5 text-sm font-semibold text-primary-container">Contact support</a>
          </section>
        </div>
        <aside className="h-fit overflow-hidden border border-background-soft-pink bg-surface-container-lowest">
          <div className="bg-background-soft-pink p-6">
            <p className="label-caps text-primary">Estimated delivery</p>
            <h2 className="mt-2 font-serif text-3xl">{order.estimatedDelivery || 'To be confirmed'}</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Standard artisanal shipping</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-primary-container transition-all" style={{ width: `${progressPct}%` }} /></div>
            <div className="mt-1 flex justify-between text-[10px] text-on-surface-variant"><span>Placed</span><span className="font-semibold text-primary">Crafting</span><span>Delivered</span></div>
            <p className="mt-1 font-mono text-[10px] text-outline">{progressPct}% · {statusMeta.label}</p>
          </div>
          <div className="space-y-6 p-6">
            {order.addressLines.length ? <div><p className="label-caps text-on-surface-variant">Shipping address</p><p className="mt-2 text-sm leading-relaxed">{order.addressLines.map((line, index) => <span key={index}>{line}{index < order.addressLines.length - 1 ? <br /> : null}</span>)}</p></div> : null}
            <div className="border-t border-surface-container-high pt-5">
              <p className="label-caps text-on-surface-variant">Payment summary</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}</span></div>
                <div className="flex justify-between border-t border-surface-container-high pt-3 font-semibold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export function TrackingPage({ orderId, orderNumber }: { orderId?: string; orderNumber?: string }) {
  const { user } = useAuthStore()
  const { data: orders, isLoading } = useOrders()

  if (orderId) {
    const matched = orders?.find((o) => o.id === orderId)
    if (isLoading) return <LoadingSkeleton />
    if (matched) return <TrackingResult order={toTrackedOrderVM(matched)} />
    return <NotFound message="We couldn't find that order on your account." />
  }

  if (orderNumber) {
    const matched = orders?.find((o) => o.order_number.toLowerCase() === orderNumber.toLowerCase())
    if (isLoading) return <LoadingSkeleton />
    if (matched) return <TrackingResult order={toTrackedOrderVM(matched)} />
    return <NotFound message="We couldn't find that order number on your account." />
  }

  if (!user) return <NotFound message="Please log in to track your orders." />

  if (isLoading) return <LoadingSkeleton />

  if (!orders?.length) {
    return (
      <main className="page-track flex min-h-[70vh] flex-col justify-center py-24">
        <div className="mx-auto w-full max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background-soft-pink text-primary"><Package className="h-7 w-7" /></div>
          <p className="label-caps mt-6 text-primary">Your handmade journey</p>
          <h1 className="mt-2 font-serif text-5xl font-semibold">No orders yet</h1>
          <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">When you place a commission it will show up here.</p>
          <Link href="/shop" className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-primary-container px-6 text-xs font-bold uppercase tracking-wider text-white pink-glow">Start browsing</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page-track pt-28 pb-20">
      <div className="mb-8">
        <p className="label-caps text-primary">Your handmade journey</p>
        <h1 className="mt-2 font-serif text-5xl font-semibold">Track your orders</h1>
        <p className="mt-3 text-sm text-on-surface-variant">Select an order to see its live status.</p>
      </div>
      <div className="space-y-4">
        {orders.map((order) => {
          const vm = toTrackedOrderVM(order)
          const statusMeta = ORDER_STATUS_MAP[order.status] ?? { label: order.status, bgColor: 'bg-surface-container', color: 'text-on-surface-variant', dot: 'bg-outline' }
          const placedOn = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          return (
            <Link key={order.id} href={`/orders/${order.id}`} className="surface-card flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-sm sm:flex-row sm:items-center sm:p-6">
              <img src={vm.items[0]?.imageUrl || IMAGE_PLACEHOLDER} alt={vm.items[0]?.name || 'Order'} className="h-24 w-24 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-on-surface-variant">{placedOn}</p>
                <h2 className="mt-1 font-serif text-xl font-medium">{vm.items.map((i) => i.name).join(', ')}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">#{order.order_number}</p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-wider ${statusMeta.bgColor} ${statusMeta.color}`}>
                  <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />{statusMeta.label}
                </span>
                <span className="font-serif text-xl">{formatPrice(order.total)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}

function LoadingSkeleton() {
  return (
    <main className="page-track flex min-h-[70vh] flex-col justify-center py-24">
      <div className="mx-auto w-full max-w-xl">
        <div className="h-8 w-48 animate-pulse rounded-full bg-surface-container-high" />
        <div className="mt-3 h-12 w-80 animate-pulse rounded-full bg-surface-container-high" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface-container-low" />)}
        </div>
      </div>
    </main>
  )
}

function NotFound({ message }: { message: string }) {
  return (
    <main className="page-track flex min-h-[70vh] flex-col justify-center py-24">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background-soft-pink text-primary"><Package className="h-7 w-7" /></div>
        <p className="label-caps mt-6 text-primary">The journey to you</p>
        <h1 className="mt-2 font-serif text-5xl font-semibold">Order not found</h1>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{message}</p>
        <Link href="/account/orders" className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-primary-container px-6 text-xs font-bold uppercase tracking-wider text-white pink-glow">View my orders</Link>
      </div>
    </main>
  )
}

export function ConfirmationPage({ orderId }: { orderId?: string }) {
  const { data: orders, isLoading } = useOrders()
  const order = orderId ? orders?.find((o) => o.id === orderId) : null
  const vm = order ? toTrackedOrderVM(order) : null

  if (isLoading) return <LoadingSkeleton />

  if (!vm) {
    return (
      <main className="page-track flex flex-col items-center py-28 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background-soft-pink text-primary-container pink-glow"><Check className="h-12 w-12" /></div>
        <p className="label-caps mt-8 text-primary">Thank you for supporting handmade</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold md:text-5xl">Order placed successfully!</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">Your beautiful pieces will be crafted with love. We&apos;ll keep you updated every step of the way.</p>
        <div className="mt-10 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/account/orders" className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-container px-6 text-xs font-bold uppercase tracking-wider text-white pink-glow"><Truck className="h-4 w-4" />View my orders</Link>
          <Link href="/shop" className="focus-ring flex min-h-12 items-center justify-center rounded-full border-2 border-primary px-6 text-xs font-bold uppercase tracking-wider text-primary">Continue shopping</Link>
        </div>
      </main>
    )
  }

  const statusMeta = ORDER_STATUS_MAP[vm.status] ?? { label: vm.status, bgColor: 'bg-surface-container', color: 'text-on-surface-variant', dot: 'bg-outline' }
  const placedOn = new Date(vm.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main className="page-track flex flex-col items-center py-28 text-center">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background-soft-pink text-primary-container pink-glow">
          <Check className="h-12 w-12" strokeWidth={3} />
        </div>
        <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-success text-xs text-white animate-bounce">✓</span>
      </div>

      <p className="label-caps mt-8 text-primary">Thank you for supporting handmade</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold md:text-5xl">Order placed successfully!</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">Your beautiful pieces will be crafted with love. We&apos;ll keep you updated every step of the way.</p>

      <div className="mt-10 grid w-full max-w-3xl gap-5 md:grid-cols-2 text-left">
        <section className="surface-card p-6">
          <h2 className="font-serif text-3xl">Order details</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-surface-dim pb-3"><dt>Order ID</dt><dd className="font-medium">#{vm.orderNumber}</dd></div>
            <div className="flex justify-between border-b border-surface-dim pb-3"><dt>Date</dt><dd>{placedOn}</dd></div>
            <div className="flex justify-between border-b border-surface-dim pb-3"><dt>Payment</dt><dd>{vm.paymentMethod === 'razorpay' ? 'Online payment (UPI)' : vm.paymentMethod}</dd></div>
          </dl>
          <div className="mt-5 flex items-center justify-between border-t border-surface-dim pt-4">
            <span className="font-serif text-2xl">Total</span>
            <span className="font-serif text-2xl font-semibold">{formatPrice(vm.total)}</span>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="font-serif text-3xl">Items</h2>
          <div className="mt-5 space-y-3">
            {vm.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 grid w-full max-w-3xl gap-5 md:grid-cols-2 text-left">
        <section className="surface-card p-6">
          <h2 className="font-serif text-3xl">Journey to you</h2>
          <div className="mt-5 space-y-4">
            {timeline.slice(0, 3).map(([title, description], index) => (
              <div key={title} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${index === 0 ? 'bg-primary-container text-white' : 'bg-surface-container-high text-outline'}`}>
                  {index === 0 ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-on-surface-variant">{index === 0 ? 'We\'ve received your order.' : 'Coming next in your handmade journey.'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="font-serif text-3xl">Shipping address</h2>
          {vm.addressLines.length ? (
            <p className="mt-5 text-sm leading-relaxed">{vm.addressLines.map((line, i) => <span key={i}>{line}{i < vm.addressLines.length - 1 ? <br /> : null}</span>)}</p>
          ) : (
            <p className="mt-5 text-sm text-on-surface-variant">Address on file</p>
          )}
        </section>
      </div>

      <div className="mt-8 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/orders/${vm.id}`} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-container px-6 text-xs font-bold uppercase tracking-wider text-white pink-glow">
          <Truck className="h-4 w-4" />Track order
        </Link>
        <Link href="/shop" className="focus-ring flex min-h-12 items-center justify-center rounded-full border-2 border-primary px-6 text-xs font-bold uppercase tracking-wider text-primary">Continue shopping</Link>
        <button type="button" onClick={() => navigator.share?.({ title: 'My Art.isticcore order', text: 'I just ordered a handmade piece from Art.isticcore.' })} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full border border-border-muted px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          <Share2 className="h-4 w-4" />Share
        </button>
      </div>

      <div className="mt-10 flex w-full max-w-3xl flex-col items-start justify-between gap-5 rounded-[28px] bg-background-warm p-6 text-left sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-2xl">What&apos;s next?</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Confirmation and updates are active. We&apos;ll notify you at every stage.</p>
        </div>
        <div className="flex gap-5 text-center text-xs text-on-surface-variant">
          <div><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary"><Mail className="h-4 w-4" /></span><span className="mt-2 block">Email sent</span></div>
          <div><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary"><Smartphone className="h-4 w-4" /></span><span className="mt-2 block">Updates active</span></div>
        </div>
      </div>
    </main>
  )
}
