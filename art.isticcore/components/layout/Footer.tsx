'use client'

import Link from 'next/link'
import { Heart, LockKeyhole, Mail, MapPin, Phone, Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-surface-container-high bg-surface-container px-6 pb-24 pt-14 md:pb-14">
      <div className="page-track">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-primary">Art.isticcore</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant">Handcrafted crochet pieces made with slow-fashion love. Every stitch is individually woven by passionate artisans across India to bring warmth, comfort, and timeless elegance to your home and loved ones.</p>
            <div className="mt-5 space-y-2 text-xs text-on-surface-variant">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Crafted in Bangalore & delivered pan-India</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />WhatsApp concierge: +91 98765 43210</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />hello@artisticcore.in</p>
            </div>
          </div>
          <div>
            <h3 className="label-caps text-on-surface">Shop & explore</h3>
            <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <li><Link href="/shop" className="focus-ring hover:text-primary">All collections</Link></li>
              <li><Link href="/custom-order" className="focus-ring flex items-center gap-1 hover:text-primary"><Sparkles className="h-3 w-3 text-primary-container" />Custom orders</Link></li>
              <li><Link href="/track-order" className="focus-ring hover:text-primary">Track order</Link></li>
              <li><Link href="/account" className="focus-ring hover:text-primary">My account</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="label-caps text-on-surface">Care & help</h3>
            <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <li>100% handcrafted guarantee</li>
              <li>Standard 12-day craft lead time</li>
              <li><Link href="/track-order" className="focus-ring hover:text-primary">Shipment status</Link></li>
              <li><Link href="/login?redirect=/admin" className="focus-ring flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary-dark"><LockKeyhole className="h-3 w-3" />Admin Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-surface-dim pt-7">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-on-surface-variant">
            <Link href="/privacy" className="focus-ring hover:text-primary">Privacy Policy</Link>
            <Link href="/terms" className="focus-ring hover:text-primary">Terms & Conditions</Link>
            <Link href="/cancellation-policy" className="focus-ring hover:text-primary">Cancellation Policy</Link>
            <Link href="/return-policy" className="focus-ring hover:text-primary">Return & Refund Policy</Link>
          </div>
          <div className="mt-5 flex flex-col items-center justify-between gap-4 text-xs text-on-surface-variant sm:flex-row">
            <p>c {new Date().getFullYear()} Art.isticcore Studio. All rights reserved.</p>
            <p className="flex items-center gap-1.5">Crafted with <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> for slow-fashion & crochet lovers</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
