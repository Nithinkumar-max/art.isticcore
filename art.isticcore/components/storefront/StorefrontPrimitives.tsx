'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  Heart,
  LockKeyhole,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import type { ProductCardModel } from '@/lib/view-models'

export interface SummaryItem {
  name: string
  price: number
  quantity: number
  imageUrl: string
  meta?: string
}

export function ProductCard({ product, compact = false }: { product: ProductCardModel; compact?: boolean }) {
  const [wishlisted, setWishlisted] = useState(false)
  const [added, setAdded] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  // IntersectionObserver — scroll-triggered fade-in, 60fps (transform+opacity only)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    // Respect reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleAdd = () => {
    addItem({
      id: `cart-${product.id}`,
      productId: product.id,
      
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
      customNote: null,
      leadTimeDays: product.leadTimeDays,
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      ref={cardRef}
      className={`group flex min-w-0 flex-col overflow-hidden rounded-[32px] border border-surface-container-high bg-surface-container-lowest p-2.5 will-change-transform transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(172,42,93,0.12)] ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} ${compact ? 'sm:flex-row sm:gap-5 sm:p-4' : 'soft-shadow'}`}
    >
      <div className={`relative shrink-0 overflow-hidden rounded-[22px] bg-surface-container-low ${compact ? 'aspect-square w-full sm:h-36 sm:w-36' : 'aspect-[4/5] w-full'}`}>
        <Link href={`/products/${product.slug}`} className="focus-ring absolute inset-0 z-[1]" aria-label={`View ${product.name}`} />
        <img src={product.imageUrl} alt={`${product.name}, handcrafted crochet product`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {product.badge ? <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{product.badge}</span> : null}
        <button type="button" onClick={() => setWishlisted((value) => !value)} className="focus-ring absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-on-surface-variant shadow-sm backdrop-blur transition hover:text-primary" aria-label={wishlisted ? `Remove ${product.name} from saved items` : `Save ${product.name}`}>
          <Heart className={`h-4 w-4 ${wishlisted ? 'fill-primary text-primary' : ''}`} strokeWidth={1.7} />
        </button>
        <span className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-on-surface/65 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm"><Clock3 className="h-3 w-3" />~{product.leadTimeDays}d craft time</span>
      </div>
      <div className={`flex min-w-0 flex-1 flex-col ${compact ? 'px-1 py-1 sm:py-2' : 'px-1 pt-3'}`}>
        <Link href={`/products/${product.slug}`} className="focus-ring rounded-sm">
          <h3 className="line-clamp-1 font-serif text-lg font-semibold text-on-surface transition-colors group-hover:text-primary">{product.name}</h3>
        </Link>
        <p className="mt-1 text-xs uppercase tracking-[0.13em] text-on-surface-variant">{product.category}</p>
        {product.rating ? <div className="mt-2 flex items-center gap-1 text-xs text-on-surface-variant"><Star className="h-3.5 w-3.5 fill-secondary-container text-secondary-container" /><span className="font-semibold text-on-surface">{product.rating.toFixed(1)}</span><span>({product.reviewCount ?? 0})</span></div> : null}
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-serif text-xl font-semibold text-primary-dark">{formatPrice(product.price)}</span>
          {product.compareAtPrice ? <span className="text-xs text-on-surface-variant/70 line-through">{formatPrice(product.compareAtPrice)}</span> : null}
        </div>
        <button type="button" onClick={handleAdd} className={`focus-ring mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold uppercase tracking-wider transition active:scale-95 ${added ? 'bg-success text-white' : 'border border-border-muted text-on-surface hover:border-primary-container hover:bg-background-soft-pink hover:text-primary'}`}>
          {added ? <><Check className="h-3.5 w-3.5" />Added</> : <><ShoppingBag className="h-3.5 w-3.5" />Add to bag</>}
        </button>
      </div>
    </article>
  )
}

export function CheckoutStepper({ current }: { current: 'cart' | 'address' | 'payment' }) {
  const steps = ['cart', 'address', 'payment'] as const
  const labels = { cart: 'Cart', address: 'Address', payment: 'Payment' }
  const activeIndex = steps.indexOf(current)
  return (
    <div className="mx-auto flex w-full max-w-xl items-start justify-center px-3 py-8" aria-label="Checkout progress">
      {steps.map((step, index) => (
        <div key={step} className="flex min-w-0 flex-1 items-start">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index <= activeIndex ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`} aria-current={step === current ? 'step' : undefined}>{index < activeIndex ? <Check className="h-4 w-4" /> : index + 1}</div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${index <= activeIndex ? 'text-primary' : 'text-on-surface-variant'}`}>{labels[step]}</span>
          </div>
          {index < steps.length - 1 ? <div className={`mt-4 h-0.5 flex-1 ${index < activeIndex ? 'bg-primary' : 'bg-surface-dim'}`} /> : null}
        </div>
      ))}
    </div>
  )
}

export function OrderSummary({ items, shipping = 0, ctaLabel, onCta, disabled = false, estimated = '15–20 days' }: { items: SummaryItem[]; shipping?: number; ctaLabel?: string; onCta?: () => void; disabled?: boolean; estimated?: string }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return (
    <aside className="surface-card flex flex-col gap-5 p-5 sm:p-7 lg:sticky lg:top-28">
      <h2 className="border-b border-surface-dim pb-4 font-serif text-3xl font-medium text-on-surface">Order Summary</h2>
      <div className="space-y-4 border-b border-surface-dim pb-5">
        {items.map((item) => <div key={`${item.name}-${item.meta ?? ''}`} className="flex items-center gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-[3px] border-surface-container-low bg-surface-container"><img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-on-surface">{item.name}</p><p className="text-xs text-on-surface-variant">Qty: {item.quantity}{item.meta ? ` · ${item.meta}` : ''}</p></div><span className="shrink-0 text-sm font-semibold text-on-surface">{formatPrice(item.price * item.quantity)}</span></div>)}
      </div>
      <div className="space-y-3 text-sm text-on-surface-variant"><div className="flex justify-between"><span>Subtotal</span><span className="text-on-surface">{formatPrice(subtotal)}</span></div><div className="flex justify-between"><span>Shipping</span><span className="font-semibold text-success">{shipping ? formatPrice(shipping) : 'Free'}</span></div><div className="flex justify-between"><span>Taxes</span><span>Included</span></div></div>
      <div className="flex items-end justify-between border-t border-surface-dim pt-4"><span className="font-serif text-2xl font-semibold">Total</span><span className="font-serif text-3xl font-semibold text-primary-dark">{formatPrice(subtotal + shipping)}</span></div>
      <p className="flex items-center justify-center gap-1 rounded-xl bg-surface-container-low px-3 py-3 text-center text-xs text-on-surface-variant"><Truck className="h-4 w-4 text-secondary" />Estimated arrival in <strong>{estimated}</strong></p>
      {ctaLabel ? <button type="button" onClick={onCta} disabled={disabled} className="focus-ring flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary-container px-5 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(255,107,157,0.65)] transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">{ctaLabel}<ArrowRight className="h-4 w-4" /></button> : null}
      <p className="flex items-center justify-center gap-1 text-center text-[11px] text-on-surface-variant"><LockKeyhole className="h-3.5 w-3.5" />Payments are secure and encrypted</p>
    </aside>
  )
}

export function TrustBadges() {
  const badges = [
    { icon: Heart, label: 'Eco-friendly', sub: 'Materials' },
    { icon: Truck, label: 'Secure', sub: 'Packaging' },
    { icon: Check, label: 'Artisan', sub: 'Crafted' },
  ]
  return <div className="grid grid-cols-3 gap-3 border-y border-surface-container-high py-5">{badges.map(({ icon: Icon, label, sub }) => <div key={label} className="flex flex-col items-center gap-2 text-center text-xs text-on-surface-variant"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-primary"><Icon className="h-5 w-5" /></span><span>{label}<br />{sub}</span></div>)}</div>
}

export function StatusPill({ children, tone = 'success' }: { children: React.ReactNode; tone?: 'success' | 'warning' | 'neutral' | 'pink' }) {
  const styles = { success: 'bg-[#dcf7ea] text-[#008a61]', warning: 'bg-[#fff0cf] text-[#a66000]', neutral: 'bg-surface-container text-on-surface-variant', pink: 'bg-background-soft-pink text-primary' }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>
}
