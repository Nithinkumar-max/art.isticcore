'use client'

import Link from 'next/link'
import { LockKeyhole, Menu, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

export function CheckoutHeader() {
  const openCart = useCartStore((state) => state.openCart)
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-surface-container-high bg-surface/95 backdrop-blur-md">
      <div className="page-track relative flex h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant sm:text-sm"><LockKeyhole className="h-5 w-5 text-primary" />Secure checkout</div>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 font-serif text-2xl font-semibold text-primary-dark sm:text-3xl">Art.isticcore</Link>
        <button type="button" onClick={openCart} className="focus-ring rounded-full p-2 text-on-surface-variant hover:bg-background-soft-pink hover:text-primary md:hidden" aria-label="Open cart"><ShoppingBag className="h-5 w-5" /></button>
        <span className="hidden text-sm text-on-surface-variant md:block">Need help? <a className="text-primary underline" href="mailto:hello@artisticcore.in">Contact us</a></span>
      </div>
    </header>
  )
}

export function AuthHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-surface-container-high bg-surface/95 backdrop-blur-md">
      <div className="page-track flex h-20 items-center justify-between">
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-full p-1 text-on-surface-variant" aria-label="Back to Art.isticcore home"><Menu className="h-5 w-5" /></Link>
        <Link href="/" className="font-serif text-2xl font-semibold text-primary-dark sm:text-3xl">Art.isticcore</Link>
        <span className="w-7" aria-hidden="true" />
      </div>
    </header>
  )
}
