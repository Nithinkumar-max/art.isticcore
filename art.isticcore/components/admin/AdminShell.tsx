'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronRight, CircleHelp, LayoutDashboard, Menu, Package, PencilRuler, Settings, ShoppingBag, UserRound, Users, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

function useNavBadges() {
  const [badges, setBadges] = useState<{ orders: number; customRequests: number }>({ orders: 0, customRequests: 0 })
  useEffect(() => {
    fetch('/api/admin/nav-badges')
      .then(r => r.json())
      .then(d => setBadges({ orders: d.orders ?? 0, customRequests: d.customRequests ?? 0 }))
      .catch(() => {})
  }, [])
  return badges
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const badges = useNavBadges()
  const { user, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: badges.orders > 0 ? String(badges.orders) : undefined },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/customers/pincodes', label: 'Customers', icon: Users },
    { href: '/admin/custom-requests', label: 'Custom Requests', icon: PencilRuler, badge: badges.customRequests > 0 ? String(badges.customRequests) : undefined },
  ]

  const current = navItems.find((item) => item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href))

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-admin-canvas"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" /></div>
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null
  }

  return (
    <div className="min-h-screen bg-admin-canvas text-on-surface">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-admin-sidebar text-white shadow-2xl md:flex">
        <AdminSidebar pathname={pathname} navItems={navItems} />
      </aside>
      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              aria-label="Close admin navigation"
              className="absolute inset-0 bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative flex h-full w-[min(82vw,18rem)] flex-col bg-admin-sidebar text-white shadow-2xl"
            >
              <AdminSidebar pathname={pathname} navItems={navItems} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-admin-border bg-surface/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} className="focus-ring rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low md:hidden" aria-label="Open admin navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-2xl font-semibold sm:text-3xl">{current?.label || 'Admin workspace'}</h1>
              <div className="hidden items-center gap-2 text-xs text-on-surface-variant sm:flex">
                <span>Admin</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-primary">{current?.label || 'Workspace'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <label className="relative hidden lg:block">
              <span className="sr-only">Search admin workspace</span>
              <input placeholder="Search orders, products..." className="focus-ring w-64 rounded-full border border-transparent bg-surface-container-low px-4 py-2.5 text-sm placeholder:text-on-surface-variant/70 focus:border-primary-container" />
            </label>
            <button type="button" className="focus-ring relative rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary-container" />
            </button>
            <button type="button" className="focus-ring hidden rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary sm:block" aria-label="Help">
              <CircleHelp className="h-5 w-5" />
            </button>
            <div className="hidden border-l border-admin-border pl-3 text-right sm:block">
              <p className="text-sm font-semibold">Art.isticcore</p>
              <p className="text-[11px] text-on-surface-variant">Store admin</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary-fixed text-primary">
              <UserRound className="h-4 w-4" />
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; badge?: string }

function AdminSidebar({ pathname, navItems, onNavigate }: { pathname: string; navItems: NavItem[]; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-start justify-between px-6 pb-7 pt-8">
        <div>
          <p className="font-serif text-3xl font-semibold leading-none text-primary-fixed-dim">Art.isticcore</p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/55">Management portal</p>
        </div>
        {onNavigate ? (
          <button type="button" onClick={onNavigate} className="focus-ring rounded-full p-2 text-white/70 hover:bg-white/10 md:hidden" aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Admin navigation">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`focus-ring flex min-h-12 items-center justify-between gap-3 rounded-full px-4 text-sm transition ${active ? 'bg-primary-container font-semibold text-on-primary-container shadow-[0_8px_22px_rgba(255,107,157,0.25)]' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="flex items-center gap-3"><Icon className="h-5 w-5" />{label}</span>
              {badge ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-white/30' : 'bg-primary-container text-on-primary-container'}`}>{badge}</span> : null}
            </Link>
          )
        })}
      </nav>
      <div className="space-y-3 border-t border-white/10 p-4">
        <Link href="/admin/settings" onClick={onNavigate} className="focus-ring flex min-h-11 items-center gap-3 rounded-full px-4 text-sm text-white/65 hover:bg-white/10 hover:text-white">
          <Settings className="h-5 w-5" />Settings
        </Link>
        <Link href="/admin/products/new" onClick={onNavigate} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-container px-4 text-sm font-semibold text-on-primary-container shadow-[0_8px_22px_rgba(255,107,157,0.25)] hover:bg-primary-dark hover:text-white">
          <Package className="h-4 w-4" />Add new product
        </Link>
        <p className="flex items-center gap-2 px-4 pt-2 text-xs text-white/50"><UserRound className="h-4 w-4" />Signed in as admin</p>
      </div>
    </>
  )
}
