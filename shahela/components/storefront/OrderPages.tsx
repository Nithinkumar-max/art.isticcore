'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Check, Headphones, Mail, Package, Share2, Smartphone, Truck } from 'lucide-react'
import { TrackOrderSchema } from '@/lib/validations'
import { formatPrice } from '@/lib/utils'
import { useOrders } from '@/lib/hooks/useOrders'
import type { OrderWithItems, ProductWithRelations } from '@/types'

const timeline = [
  ['Order confirmed', 'We received your order and payment.'],
  ['Yarn selected', 'Premium yarn selected for your piece.'],
  ['In production (handcrafting)', 'Our artisans are carefully crocheting your item.'],
  ['Quality check & packaging', 'Ensuring perfection before dispatch.'],
  ['Shipped', 'Your order will be handed to our delivery partner.'],
]

const IMAGE_PLACEHOLDER = '/images/product-placeholder.webp'

interface TrackedItemVM { name: string; imageUrl: string; quantity: number; price: number }
export interface TrackedOrderVM {
  orderNumber: string
  status: string
  createdAt: string
  estimatedDelivery: string
  items: TrackedItemVM[]
  subtotal: number
  shippingFee: number
  total: number
  addressLines: string[]
}

function statusToStageIndex(status: string): number {
  if (['PLACED', 'PAYMENT_PENDING', 'CONFIRMED'].includes(status)) return 0
  if (status === 'IN_PRODUCTION') return 2
  if (['QUALITY_CHECK', 'PACKED'].includes(status)) return 3
  return 4
}

function toTrackedOrderVM(order: OrderWithItems): TrackedOrderVM {
  const address = order.address
  return {
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
    })),
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee,
    total: order.total,
    addressLines: address
      ? [address.full_name, address.line1, address.line2, `${address.city}, ${address.state} ${address.pincode}`]
          .filter((line): line is string => Boolean(line))
      : [],
  }
}

export function TrackingPage({ orderNumber }: { orderNumber?: string }) {
  const router = useRouter()
  const [number, setNumber] = useState(orderNumber || '')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const { data: orders, isLoading } = useOrders()
  const matched = orders?.find((order) => order.order_number.toLowerCase() === (orderNumber || '').toLowerCase())
  const result = matched ? toTrackedOrderVM(matched) : null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = TrackOrderSchema.safeParse({ order_number: number, phone })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check your details')
      return
    }
    setError('')
    router.push(`/track-order?order=${encodeURIComponent(number)}`)
  }

  if (result) return <TrackingResult order={result} />

  return (
    <main className="page-track flex min-h-[70vh] flex-col justify-center py-24">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background-soft-pink text-primary"><Package className="h-7 w-7" /></div>
        <p className="label-caps mt-6 text-primary">The journey to you</p>
        <h1 className="mt-2 font-serif text-5xl font-semibold">Track your order</h1>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">Enter your order number and the mobile number used at checkout to see the latest stitch in your journey.</p>
        <form onSubmit={submit} className="surface-card mt-8 space-y-4 p-5 text-left sm:p-7">
          <label className="block"><span className="label-caps text-on-surface-variant">Order number</span><input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="e.g. ART-26-100001" className="form-input mt-2" /></label>
          <label className="block"><span className="label-caps text-on-surface-variant">Mobile number</span><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10-digit mobile" className="form-input mt-2" /></label>
          {error ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}
          {orderNumber && !isLoading && !matched ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">We couldn’t find that order on your account. Check the number and try again.</p> : null}
          <button type="submit" className="focus-ring flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark">Find my order <ArrowRight className="h-4 w-4" /></button>
        </form>
      </div>
    </main>
  )
}

function TrackingResult({ order }: { order: TrackedOrderVM }) {
  const activeIndex = statusToStageIndex(order.status)
  const placedOn = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <main className="page-track pt-28 pb-20">
      <div className="mb-8"><p className="label-caps text-primary">Order #{order.orderNumber}</p><h1 className="mt-2 font-serif text-5xl font-semibold">Track your order</h1><p className="mt-3 text-sm text-on-surface-variant">Placed on {placedOn} · Handcrafted with care</p></div>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-8">
          <section className="surface-card p-5 sm:p-8">
            <h2 className="font-serif text-3xl">Order status</h2>
            <div className="mt-7 space-y-0">
              {timeline.map(([title, description], index) => {
                const active = index === activeIndex
                const complete = index < activeIndex
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
          <section className="surface-card p-5 sm:p-8"><h2 className="font-serif text-3xl">Items in this order</h2><div className="mt-5 divide-y divide-surface-container-high">{order.items.map((item) => <div key={item.name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><h3 className="text-sm font-medium">{item.name}</h3><p className="mt-1 text-sm text-on-surface-variant">Qty: {item.quantity}</p></div><span className="font-serif text-xl">{formatPrice(item.price)}</span></div>)}</div></section>
          <section className="flex flex-col items-start justify-between gap-4 border border-outline-variant bg-background-soft-pink p-5 sm:flex-row sm:items-center sm:p-6"><div className="flex items-center gap-3"><Headphones className="h-6 w-6 text-primary-container" /><div><h3 className="text-sm font-medium">Need help with your order?</h3><p className="text-sm text-on-surface-variant">We’re here to answer any questions.</p></div></div><a href="mailto:hello@artisticcore.in" className="focus-ring rounded-full border-2 border-primary-container px-5 py-2.5 text-sm font-semibold text-primary-container">Contact support</a></section>
        </div>
        <aside className="h-fit overflow-hidden border border-background-soft-pink bg-surface-container-lowest"><div className="bg-background-soft-pink p-6"><p className="label-caps text-primary">Estimated delivery</p><h2 className="mt-2 font-serif text-3xl">{order.estimatedDelivery || 'To be confirmed'}</h2><p className="mt-2 text-sm text-on-surface-variant">Standard artisanal shipping</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-primary-container" style={{ width: `${Math.min(100, (statusToStageIndex(order.status) + 1) * 25)}%` }} /></div><div className="mt-1 flex justify-between text-[10px] text-on-surface-variant"><span>Placed</span><span className="font-semibold text-primary">Crafting</span><span>Delivered</span></div></div><div className="space-y-6 p-6">{order.addressLines.length ? <div><p className="label-caps text-on-surface-variant">Shipping address</p><p className="mt-2 text-sm leading-relaxed">{order.addressLines.map((line, index) => <span key={index}>{line}{index < order.addressLines.length - 1 ? <br /> : null}</span>)}</p></div> : null}<div className="border-t border-surface-container-high pt-5"><p className="label-caps text-on-surface-variant">Payment summary</p><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div><div className="flex justify-between"><span>Shipping</span><span>{order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}</span></div><div className="flex justify-between border-t border-surface-container-high pt-3 font-semibold"><span>Total</span><span>{formatPrice(order.total)}</span></div></div></div></div></aside>
      </div>
    </main>
  )
}

export function ConfirmationPage() {
  return (
    <main className="page-track flex flex-col items-center py-28 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background-soft-pink text-primary-container pink-glow"><Check className="h-12 w-12" /></div>
      <p className="label-caps mt-8 text-primary">Thank you for supporting handmade</p><h1 className="mt-2 font-serif text-4xl font-semibold md:text-5xl">Order placed successfully!</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">Your beautiful pieces will be crafted with love. We’ll keep you updated every step of the way.</p>
      <div className="mt-10 grid w-full max-w-3xl gap-5 md:grid-cols-2"><section className="surface-card p-6 text-left"><h2 className="font-serif text-3xl">Order details</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between border-b border-surface-dim pb-3"><dt>Order ID</dt><dd className="font-medium">#AC-2024-8921</dd></div><div className="flex justify-between border-b border-surface-dim pb-3"><dt>Date</dt><dd>October 24, 2024</dd></div><div className="flex justify-between border-b border-surface-dim pb-3"><dt>Payment</dt><dd>Online payment</dd></div></dl><div className="mt-5 flex items-center justify-between border-t border-surface-dim pt-4"><span className="font-serif text-2xl">Total</span><span className="font-serif text-2xl font-semibold">₹4,860</span></div></section><section className="surface-card p-6 text-left"><h2 className="font-serif text-3xl">Journey to you</h2><div className="mt-5 space-y-4">{['Order placed', 'Production starts', 'Quality check', 'Shipped', 'Delivered'].map((item, index) => <div key={item} className="flex items-start gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${index === 0 ? 'bg-primary-container text-white' : 'bg-surface-container-high text-outline'}`}>{index === 0 ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-white" />}</span><div><p className="text-sm font-medium">{item}</p><p className="text-xs text-on-surface-variant">{index === 0 ? 'We’ve received your order.' : 'Coming next in your handmade journey.'}</p></div></div>)}</div></section></div>
      <div className="mt-8 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center"><Link href="/track-order?order=KNT-9824" className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-container px-6 text-xs font-bold uppercase tracking-wider text-white pink-glow"><Truck className="h-4 w-4" />Track order</Link><Link href="/shop" className="focus-ring flex min-h-12 items-center justify-center rounded-full border-2 border-primary px-6 text-xs font-bold uppercase tracking-wider text-primary">Continue shopping</Link><button type="button" onClick={() => navigator.share?.({ title: 'My Art.isticcore order', text: 'I just ordered a handmade piece from Art.isticcore.' })} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full border border-border-muted px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant"><Share2 className="h-4 w-4" />Share</button></div>
      <div className="mt-10 flex w-full max-w-3xl flex-col items-start justify-between gap-5 rounded-[28px] bg-background-warm p-6 text-left sm:flex-row sm:items-center"><div><h2 className="font-serif text-2xl">What’s next?</h2><p className="mt-1 text-sm text-on-surface-variant">Confirmation and SMS updates are active.</p></div><div className="flex gap-5 text-center text-xs text-on-surface-variant"><div><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary"><Mail className="h-4 w-4" /></span><span className="mt-2 block">Email sent</span></div><div><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary"><Smartphone className="h-4 w-4" /></span><span className="mt-2 block">SMS active</span></div></div></div>
    </main>
  )
}
