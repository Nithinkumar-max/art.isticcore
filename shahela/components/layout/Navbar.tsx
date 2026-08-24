'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useHydrated } from '@/lib/hooks/useHydrated'
import { Search, Menu, User, Sparkles, X, ShoppingBag } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

const navItems = [
  { href: '/shop', label: 'Shop All' },
  { href: '/collections/sunflower', label: 'Floral Bouquets' },
  { href: '/custom-order', label: 'Custom Order', icon: Sparkles },
  { href: '/track-order', label: 'Track Order' },
  { href: '/#story', label: 'Our Story' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const openCart = useCartStore((state) => state.openCart)
  const itemCount = useCartStore((state) => state.itemCount)
  const hydrated = useHydrated()
  const visibleItemCount = hydrated ? itemCount() : 0

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    setSearchOpen(false)
    router.push(`/shop?q=${encodeURIComponent(query)}`)
  }

  return (
    <header className={`fixed inset-x-0 top-0 z-40 border-b border-surface-container-high/70 transition-all duration-300 ${isScrolled ? 'bg-surface/95 py-3 shadow-sm backdrop-blur-md' : 'bg-surface/90 py-4 backdrop-blur-sm'}`}>
      <div className="page-track flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="focus-ring rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" strokeWidth={1.7} /> : <Menu className="h-5 w-5" strokeWidth={1.7} />}
          </button>
          <Link href="/" className="focus-ring font-serif text-2xl font-semibold tracking-tight text-primary-dark sm:text-3xl">
            Art.isticcore
          </Link>
        </div>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.href === '/shop' ? pathname.startsWith('/shop') : item.href.includes('/collections') ? pathname.startsWith('/collections') : item.href !== '/#story' && pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={`focus-ring flex items-center gap-1 text-sm transition-colors hover:text-primary ${active ? 'font-semibold text-primary' : 'text-on-surface-variant'}`}>
                {Icon ? <Icon className="h-3.5 w-3.5 text-primary-container" /> : null}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => setSearchOpen((open) => !open)} className="focus-ring rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary" aria-label="Search products" aria-expanded={searchOpen}>
            <Search className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <Link href="/account" className="focus-ring hidden rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary sm:block" aria-label="Account">
            <User className="h-5 w-5" strokeWidth={1.7} />
          </Link>
          <button type="button" onClick={openCart} className="focus-ring relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary" aria-label={`Open cart${visibleItemCount ? `, ${visibleItemCount} items` : ''}`}>
            <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
            {visibleItemCount > 0 ? <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-container px-1 text-[10px] font-bold text-white">{visibleItemCount}</span> : null}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {searchOpen ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-surface-container-high bg-surface px-4 pt-3">
            <form onSubmit={submitSearch} className="page-track-narrow flex gap-2 pb-3">
              <label className="relative flex-1">
                <span className="sr-only">Search products</span>
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search bouquets, coasters, plushies..." className="focus-ring w-full rounded-full border border-outline-variant bg-surface-container-low px-11 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/70" />
              </label>
              <button type="submit" className="focus-ring rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-dark">Search</button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {mobileMenuOpen ? (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-surface-container-high bg-surface px-6 lg:hidden" aria-label="Mobile navigation">
            <div className="space-y-1 py-4">
              {navItems.filter((item) => item.href !== '/#story').map((item) => {
                const Icon = item.icon
                return <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="focus-ring flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-background-soft-pink hover:text-primary">{Icon ? <Icon className="h-4 w-4 text-primary-container" /> : null}{item.label}</Link>
              })}
              <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="focus-ring flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-background-soft-pink hover:text-primary"><User className="h-4 w-4" />My Account & Orders</Link>
              <Link href="/#story" onClick={() => setMobileMenuOpen(false)} className="focus-ring flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-background-soft-pink hover:text-primary">Our Artisanal Story</Link>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
