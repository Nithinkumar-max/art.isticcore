'use client'

import { usePathname } from 'next/navigation'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { Footer } from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Navbar } from '@/components/layout/Navbar'
import { CheckoutHeader, AuthHeader } from '@/components/storefront/StorefrontHeaders'
import { LogoutToast } from '@/components/storefront/LogoutToast'

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = pathname === '/login'
  const isCheckout = pathname.startsWith('/checkout')
  const isTracking = pathname.startsWith('/track-order')

  return (
    <div className="min-h-screen bg-background-warm text-on-surface">
      {isAuth ? <AuthHeader /> : isCheckout ? <CheckoutHeader /> : <Navbar />}
      <div className={isAuth ? '' : isCheckout ? '' : 'pb-16 md:pb-0'}>{children}</div>
      {!isAuth ? <Footer /> : null}
      {!isAuth && !isCheckout && !isTracking ? <MobileNav /> : null}
      <CartDrawer />
      <LogoutToast />
    </div>
  )
}
