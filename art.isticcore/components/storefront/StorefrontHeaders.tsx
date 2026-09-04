'use client'

import Link from 'next/link'
import { LockKeyhole, Menu, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

export function CheckoutHeader() {
  const openCart = useCartStore((state) => state.openCart)
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-surface-container-high bg-surface/95 backdrop-blur-md">
      <div className="page-track grid h-20 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant sm:text-sm">
          <LockKeyhole className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate">Secure checkout</span>
        </div>
        <Link href="/" className="shrink-0 px-1 font-serif text-2xl font-semibold text-primary-dark sm:text-3xl">Art.isticcore</Link>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <button type="button" onClick={openCart} className="focus-ring shrink-0 rounded-full p-2 text-on-surface-variant hover:bg-background-soft-pink hover:text-primary md:hidden" aria-label="Open cart"><ShoppingBag className="h-5 w-5" /></button>
          <span className="hidden text-sm text-on-surface-variant md:block truncate">Need help? <a className="text-primary underline" href="mailto:artisticcore@gmail.com">Contact us</a></span>
        </div>
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
