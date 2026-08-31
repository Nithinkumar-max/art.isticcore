'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Sparkles, Store, User } from 'lucide-react'

const items = [
  { href: '/', label: 'Home', icon: Store },
  { href: '/shop', label: 'Shop', icon: Heart },
  { href: '/custom-order', label: 'Custom', icon: Sparkles },
  { href: '/account', label: 'Account', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-container-high bg-surface/95 px-3 py-2 shadow-[0_-8px_28px_rgba(172,42,93,0.10)] backdrop-blur-lg md:hidden" aria-label="Mobile shortcuts">
      <div className="mx-auto flex h-14 max-w-md items-center justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={label} href={href} className={`focus-ring relative flex min-w-16 flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider transition-all active:scale-90 ${active ? 'bg-primary-container text-on-primary-container shadow-xs' : 'text-on-surface-variant hover:text-primary'}`}>
              <Icon className="h-5 w-5" strokeWidth={1.7} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
