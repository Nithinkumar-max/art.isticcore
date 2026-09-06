'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronRight, CircleHelp, LayoutDashboard, LogOut, Menu, Package, PencilRuler, RotateCcw, Settings, ShoppingBag, UserRound, Users, X } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { SESSION_COOKIE_NAME } from '@/lib/session-ttl'
import { formatDistanceToNow } from 'date-fns'

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

type NotificationItem = {
  id: string
  order_number?: string
  status?: string
  payment_status?: string
  total?: number | string
  payment_method?: string
  created_at: string
  name?: string
  contact?: string
  email?: string
  user?: { id: string; name: string; email: string } | null
}

type NotificationsPayload = {
  total: number
  counts: { activeOrders: number; refundsPending: number; customRequests: number }
  activeOrders: NotificationItem[]
  refundsPending: NotificationItem[]
  customRequests: NotificationItem[]
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationsPayload | null>(null)
  const [failed, setFailed] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const load = useCallback(() => {
    fetch('/api/admin/notifications')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        setData(d as NotificationsPayload)
        setFailed(false)
      })
      .catch((err: unknown) => {
        console.warn('Notifications failed to load:', err)
        setFailed(true)
      })
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, 60000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const total = data?.total ?? 0

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="focus-ring relative rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
        aria-label={`Notifications${total > 0 ? `, ${total} need attention` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {total > 0 ? (
            <motion.span
              key="dot"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-container px-1 text-[9px] font-bold text-on-primary-container"
            >
              {total > 9 ? '9+' : total}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-40 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-admin-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {total > 0 ? <span className="rounded-full bg-primary-container/20 px-2 py-0.5 text-[11px] font-semibold text-primary">{total} to check</span> : null}
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              {failed ? (
                <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
                  <Bell className="mx-auto mb-2 h-5 w-5 text-error/60" />
                  <p>Couldn&apos;t load notifications.</p>
                  <button
                    type="button"
                    onClick={load}
                    className="focus-ring mt-3 rounded-full border border-admin-border px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary"
                  >
                    Try again
                  </button>
                </div>
              ) : total === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
                  <Bell className="mx-auto mb-2 h-5 w-5 text-primary/50" />
                  You&apos;re all caught up.
                </div>
              ) : (
                <>
                  <NotificationGroup label="Orders to process" count={data?.counts.activeOrders ?? 0} href="/admin/orders" icon={ShoppingBag} items={data?.activeOrders ?? []} format={(i) => `#${i.order_number} · ${inr.format(Number(i.total))}${i.user?.name ? ` · ${i.user.name}` : ''}`} onNavigate={() => setOpen(false)} />
                  <NotificationGroup label="Refunds to process" count={data?.counts.refundsPending ?? 0} href="/admin/orders" icon={RotateCcw} items={data?.refundsPending ?? []} format={(i) => `#${i.order_number} · ${inr.format(Number(i.total))} · Razorpay`} onNavigate={() => setOpen(false)} tone="warning" />
                  <NotificationGroup label="New custom requests" count={data?.counts.customRequests ?? 0} href="/admin/custom-requests" icon={PencilRuler} items={data?.customRequests ?? []} format={(i) => `${i.name ?? 'New request'}${i.contact ? ` · ${i.contact}` : ''}`} onNavigate={() => setOpen(false)} />
                </>
              )}
            </div>
            <div className="border-t border-admin-border px-4 py-2 text-[11px] text-on-surface-variant">Refreshes every minute · actions are manual, no automation</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function NotificationGroup({ label, count, href, icon: Icon, items, format, tone, onNavigate }: {
  label: string
  count: number
  href: string
  icon: typeof ShoppingBag
  items: NotificationItem[]
  format: (item: NotificationItem) => string
  tone?: 'warning'
  onNavigate: () => void
}) {
  if (count === 0) return null
  return (
    <div className="border-b border-admin-border last:border-0">
      <div className="sticky top-0 flex items-center gap-2 border-b border-admin-border bg-surface px-4 py-2.5">
        <Icon className={`h-4 w-4 ${tone === 'warning' ? 'text-secondary' : 'text-primary'}`} />
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
        <span className="ml-auto rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">{count}</span>
      </div>
      <ul>
        {items.slice(0, 6).map((item) => (
          <li key={item.id}>
            <Link href={href} onClick={onNavigate} className="focus-ring flex items-start justify-between gap-3 px-4 py-3 hover:bg-background-warm/60">
              <span className="line-clamp-1 text-sm">{format(item)}</span>
              <span className="shrink-0 text-[11px] text-on-surface-variant">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const badges = useNavBadges()
  const { user, isLoading, logout } = useAuthStore()

  const isAdminLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isAdminLoginPage) return
    if (!isLoading && (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))) {
      router.replace('/admin/login')
    }
  }, [user, isLoading, router, isAdminLoginPage])

  const handleLogout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
      logout()
      router.replace('/admin/login')
      router.refresh()
    } catch {
      setSigningOut(false)
    }
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: badges.orders > 0 ? String(badges.orders) : undefined },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/customers/pincodes', label: 'Customers', icon: Users },
    { href: '/admin/custom-requests', label: 'Custom Requests', icon: PencilRuler, badge: badges.customRequests > 0 ? String(badges.customRequests) : undefined },
  ]

  const current = navItems.find((item) => item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href))

  // The dedicated admin sign-in page is rendered WITHOUT the shell chrome —
  // it must stay reachable whether or not a session exists.
  if (isAdminLoginPage) {
    return <>{children}</>
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-admin-canvas"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" /></div>
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null
  }

  return (
    <div className="min-h-screen bg-admin-canvas text-on-surface">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-admin-sidebar text-white shadow-2xl md:flex">
        <AdminSidebar pathname={pathname} navItems={navItems} onLogout={handleLogout} signingOut={signingOut} />
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
              <AdminSidebar pathname={pathname} navItems={navItems} onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} signingOut={signingOut} />
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
          <div className="flex items-center gap-1 sm:gap-2.5">
            <NotificationsBell />
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
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="focus-ring rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-error"
              aria-label="Log out of the Studio"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; badge?: string }

function AdminSidebar({ pathname, navItems, onNavigate, onLogout, signingOut }: { pathname: string; navItems: NavItem[]; onNavigate?: () => void; onLogout: () => void; signingOut: boolean }) {
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
        <button
          type="button"
          onClick={onLogout}
          disabled={signingOut}
          className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-sm text-white/65 transition hover:bg-error hover:text-white disabled:opacity-60"
        >
          <LogOut className="h-5 w-5" />{signingOut ? 'Signing out...' : 'Log out'}
        </button>
        <p className="flex items-center gap-2 px-4 pt-2 text-xs text-white/50"><UserRound className="h-4 w-4" />Signed in as admin · 60-min auto sign-out</p>
      </div>
    </>
  )
}
