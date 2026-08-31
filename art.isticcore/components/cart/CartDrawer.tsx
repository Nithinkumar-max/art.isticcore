'use client'

import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useHydrated } from '@/lib/hooks/useHydrated'
import { useEffect } from 'react'

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
    itemCount,
    maxLeadTime,
  } = useCartStore()
  const hydrated = useHydrated()

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeCart, isOpen])

  return (
    <AnimatePresence>
      {hydrated && isOpen ? <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.button
        type="button"
        aria-label="Close cart"
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={closeCart}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Slide-over Drawer Panel */}
      <motion.div role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 32 }} className="relative z-10 flex w-full max-w-md flex-col bg-[#fcf9f8] text-[#1c1b1b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eae7e7] px-6 py-4 bg-[#ffffff]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#ac2a5d]" />
            <h2 id="cart-drawer-title" className="font-serif text-xl font-semibold tracking-tight text-[#1c1b1b]">
              Your Cart
            </h2>
            <span className="rounded-full bg-[#ffd9e1] px-2.5 py-0.5 text-xs font-bold text-[#6e0035]">
              {itemCount()}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-full p-2 text-[#574146] hover:bg-[#f6f3f2] hover:text-[#ac2a5d] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lead time notice */}
        {items.length > 0 && (
          <div className="bg-[#fff0f5] px-6 py-3 text-xs text-[#8c0a46] border-b border-[#ffd9e1] flex items-center gap-2 font-sans">
            <Sparkles className="h-4 w-4 shrink-0 text-[#ff6b9d]" />
            <span>
              <strong>Slow Fashion</strong>: Handcrafted to order. Production lead time: ~{maxLeadTime()} days.
            </span>
          </div>
        )}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#fff0f5] flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-[#ff6b9d]" />
              </div>
              <p className="font-serif text-2xl font-semibold text-[#1c1b1b]">
                Your bag is empty
              </p>
              <p className="text-xs text-[#574146] mt-2 max-w-xs font-sans">
                Discover our artisanal crochet bouquets and bespoke handmade designs.
              </p>
              <Link
                href="/shop"
                onClick={closeCart}
                className="mt-6 rounded-full bg-[#ac2a5d] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#e63a73] transition-colors shadow-xs"
              >
                Explore Collection
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 bg-white p-3.5 rounded-2xl border border-[#eae7e7] soft-shadow"
              >
                {/* Product Image */}
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#f6f3f2] border border-[#ddbfc5]/40">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#8a7176]">
                      🧶
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-serif text-base font-semibold leading-snug text-[#1c1b1b] line-clamp-1">
                        {item.name}
                      </h4>

                      {item.customNote && (
                        <p className="text-xs text-[#8a7176] italic font-sans mt-0.5 line-clamp-1">
                          Note: {item.customNote}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-[#8a7176] hover:text-[#ef4444] transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center rounded-full border border-[#ddbfc5] bg-[#f6f3f2] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-[#574146] hover:text-[#ac2a5d] hover:bg-[#fff0f5]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-semibold text-[#1c1b1b]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 text-[#574146] hover:text-[#ac2a5d] hover:bg-[#fff0f5]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="text-sm font-bold text-[#ac2a5d]">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#eae7e7] bg-[#ffffff] p-6">
            <div className="flex justify-between text-sm mb-2 text-[#574146] font-sans">
              <span>Subtotal</span>
              <span className="font-serif text-lg font-bold text-[#1c1b1b]">
                {formatPrice(subtotal())}
              </span>
            </div>
            <p className="text-xs text-[#8a7176] mb-4 font-sans">
              Free insured delivery on prepaid orders.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/cart"
                onClick={closeCart}
                className="flex items-center justify-center rounded-full border-2 border-[#ac2a5d] px-4 py-3 text-xs font-bold text-[#ac2a5d] hover:bg-[#fff0f5] transition-colors"
              >
                View Full Cart
              </Link>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#ac2a5d] px-4 py-3 text-xs font-bold text-white pink-glow hover:bg-[#e63a73] transition-colors"
              >
                <span>Checkout</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div> : null}
    </AnimatePresence>
  )
}
