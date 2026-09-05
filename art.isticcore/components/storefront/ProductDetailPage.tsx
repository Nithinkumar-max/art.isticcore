'use client'

import { useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Clock3, Heart, Leaf, Minus, Plus, Share2, ShoppingBag, Star, Truck } from 'lucide-react'
import { formatPrice, discountPercent } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import type { ProductCardModel } from '@/lib/view-models'
import { TrustBadges } from '@/components/storefront/StorefrontPrimitives'
import Link from 'next/link'

export function ProductDetailPage({ product }: { product: ProductCardModel }) {
  const [activeImage, setActiveImage] = useState(0)
  const [activeVariant, setActiveVariant] = useState(product.variants[1]?.id || product.variants[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState('description')
  const [saved, setSaved] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)
  const variant = product.variants.find((item) => item.id === activeVariant)
  const price = variant?.price ?? product.price
  const compareAt = variant?.compareAtPrice ?? product.compareAtPrice

  const addToCart = () => {
    addItem({ id: `cart-${product.id}-${activeVariant || 'default'}`, productId: product.id, name: product.name, price, imageUrl: product.imageUrl, quantity, customNote: null, leadTimeDays: variant?.leadTimeDays ?? product.leadTimeDays })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  const shareProduct = async () => {
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: product.name, text: product.shortDescription, url })
    else await navigator.clipboard?.writeText(url)
  }

  return (
    <main className="page-track pt-28 pb-20">
      <div className="mb-6 flex items-center gap-2 text-xs text-on-surface-variant"><Link href="/" className="hover:text-primary">Home</Link><ChevronRight className="h-3.5 w-3.5" /><Link href={`/collections/${product.categorySlug}`} className="hover:text-primary">{product.category}</Link><ChevronRight className="h-3.5 w-3.5" /><span className="truncate text-on-surface">{product.name}</span></div>
      <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
        <section className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="order-2 flex gap-3 overflow-x-auto pb-1 md:order-1 md:w-20 md:flex-col md:overflow-y-auto">
              <button type="button" onClick={() => setActiveImage(0)} className={`focus-ring h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 ${activeImage === 0 ? 'border-primary' : 'border-transparent opacity-70'}`}><img src={product.gallery[0] || product.imageUrl} alt={`${product.name} main view`} className="h-full w-full object-cover" /></button>
              {product.gallery.slice(1).map((image, index) => <button type="button" key={image} onClick={() => setActiveImage(index + 1)} className={`focus-ring h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 ${activeImage === index + 1 ? 'border-primary' : 'border-transparent opacity-70'}`}><img src={image} alt={`${product.name} detail view ${index + 2}`} className="h-full w-full object-cover" /></button>)}
            </div>
            <div className="relative order-1 aspect-square min-w-0 flex-1 overflow-hidden rounded-[32px] border-[3px] border-surface-container-low bg-surface-container-lowest soft-shadow md:order-2 lg:aspect-[4/5]">
              <img src={product.gallery[activeImage] || product.imageUrl} alt={`${product.name}, handcrafted crochet product`} className="h-full w-full object-cover transition duration-700 hover:scale-105" />
              <span className="absolute left-5 top-5 rounded-full bg-secondary-container px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{product.badge || 'Handcrafted'}</span>
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button type="button" onClick={() => setSaved((value) => !value)} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-on-surface shadow-sm backdrop-blur hover:text-primary" aria-label={saved ? 'Remove from saved items' : 'Save product'}><Heart className={`h-5 w-5 ${saved ? 'fill-primary text-primary' : ''}`} /></button>
                <button type="button" onClick={shareProduct} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-on-surface shadow-sm backdrop-blur hover:text-primary" aria-label="Share product"><Share2 className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-6">
          <div><p className="label-caps text-primary">{product.category}</p><h1 className="mt-2 font-serif text-4xl font-semibold leading-tight md:text-5xl">{product.name}</h1><div className="mt-4 flex items-center gap-3"><div className="flex items-center gap-0.5 text-secondary-container">{[0, 1, 2, 3, 4].map((star) => <Star key={star} className="h-4 w-4 fill-current" />)}</div><span className="text-sm text-on-surface-variant">{product.rating?.toFixed(1)} ({product.reviewCount} reviews)</span></div></div>
          <div className="rounded-3xl bg-background-soft-pink p-5 sm:p-6"><div className="flex flex-wrap items-center gap-3"><span className="font-serif text-3xl font-semibold text-primary-dark">{formatPrice(price)}</span>{compareAt ? <span className="text-base text-on-surface-variant line-through">{formatPrice(compareAt)}</span> : null}{compareAt ? <span className="rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{discountPercent(compareAt, price)}% off</span> : null}</div><p className="mt-2 text-xs text-on-surface-variant">Taxes included. Shipping calculated at checkout.</p></div>
          {product.variants.length ? <div><div className="flex items-center justify-between"><h2 className="font-serif text-xl">Select size</h2><button type="button" className="text-xs text-primary underline">Size guide</button></div><div className="mt-3 grid grid-cols-3 gap-2">{product.variants.map((item) => <button type="button" key={item.id} onClick={() => setActiveVariant(item.id)} className={`focus-ring relative min-h-16 rounded-full border px-3 text-xs transition ${activeVariant === item.id ? 'border-2 border-primary bg-background-soft-pink font-semibold text-primary' : 'border-border-muted hover:border-primary'}`}>{item.name}{activeVariant === item.id ? <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"><Check className="h-3 w-3" /></span> : null}</button>)}</div></div> : null}
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-secondary/40 bg-background-warm p-4"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" /><div><h3 className="text-sm font-semibold text-secondary">Made to order</h3><p className="mt-1 text-xs leading-relaxed text-on-surface-variant">This piece is meticulously handcrafted just for you. Please allow {variant?.leadTimeDays ?? product.leadTimeDays} business days for creation before shipping.</p></div></div>
          <div className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row"><div className="flex h-14 items-center justify-between rounded-full bg-surface-container-highest px-2 sm:w-1/3"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-dim" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button><span className="font-semibold">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(10, value + 1))} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-dim" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button></div><button type="button" onClick={addToCart} className={`focus-ring flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-base font-semibold text-white transition ${added ? 'bg-success' : 'bg-primary-container pink-glow hover:bg-primary-dark'}`}>{added ? <><Check className="h-5 w-5" />Added to bag</> : <><ShoppingBag className="h-5 w-5" />Add to cart</>}</button></div><button type="button" onClick={() => { addToCart(); window.location.href = '/cart' }} className="focus-ring h-13 w-full rounded-full border-2 border-primary py-3 text-sm font-semibold text-primary hover:bg-background-soft-pink">Buy it now</button><a href="mailto:artisticcore@gmail.com" className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full bg-[#e4f7e8] text-sm font-medium text-tertiary hover:bg-[#d5f0db]"><span className="text-base">▣</span>Inquire via email</a></div>
          <TrustBadges />
          <div className="mt-1 flex border-b border-surface-container-high overflow-x-auto" role="tablist" aria-label="Product information">{[['description', 'Description'], ['care', 'Care Guide'], ['shipping', 'Shipping & Returns'], ['reviews', `Reviews (${product.reviewCount})`]].map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)} className={`focus-ring whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium ${tab === value ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>{label}</button>)}</div>
          <div className="prose prose-sm max-w-none text-on-surface-variant"><p>{tab === 'description' ? product.description : tab === 'care' ? 'Gently hand wash in cool water, reshape while damp, and dry flat away from direct sunlight. Store your piece folded with room to breathe.' : tab === 'shipping' ? 'Each Art.isticcore piece is packed with care and dispatched after its craft window. Enjoy insured pan-India delivery and reach out within 7 days for support.' : 'Loved by our community for its thoughtful texture, cheerful colour, and lasting handmade character.'}</p>{tab === 'description' ? <><h3 className="font-serif text-xl text-on-surface">Product details</h3><ul><li>100% premium cotton yarn</li><li>Hand-shaped petals and flexible inner wire</li><li>Beautifully wrapped in recyclable kraft paper</li></ul></> : null}</div>
        </section>
      </div>
    </main>
  )
}
