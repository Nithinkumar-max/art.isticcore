'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

const FALLBACK_IMAGES = {
  desktop: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1pCzejkLhM39B8ZKwP7w_OxCeI6EK1d_632NN2VsBK-BcBd-rLk3LT-PtDOmtxiZ6re2yzgOxiKzTKffGc0-T6UJPc42rR5qL8YJXO0_am5ZJXLcfIzT-oqmRBsoVceuZSGud9EmBg3G-muppQj3n-H7-lVeEtiBO-GIrNkHopQFzZqfb2cd8hn9ya590NkI_G7ZLvb7xkN2eZQTlg1pNYouL9IO6OGAxGB0Z5HyFbqK9iMvXHt45QA',
  mobile: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCzjnkXgIWuLfWYFdSfMSPa0JWOwN2CydFETlgmvNhvrK8Uftp9zDtj3XhE26FEw9t2i218mcKWkwDD3oc9O_3fCo4UypPFSuTxFbsgaVi23VIWJJVvKb1KQ7GwqUOpqTFqAN_2ChhgP8CQPQUmQWnfYcq2-t9K945JWiPO8eqpA28Kmk6VDzOadGSj82Q6V6TNmjJVUNPo6NU9rDh2aPPZeN3cywT4M9fZq1dYBv3uXoxT3bRtzZGHA',
}

interface HeroSectionProps {
  desktopUrl?: string
  mobileUrl?: string
}

export function HeroSection({ desktopUrl, mobileUrl }: HeroSectionProps) {
  return (
    <section className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-8 md:py-6">
      <div className="relative w-full min-h-[480px] md:aspect-[21/9] md:min-h-[440px] rounded-[28px] md:rounded-[36px] overflow-hidden isolate shadow-xl soft-shadow bg-[#f6f3f2] flex flex-col justify-end md:justify-center">
        {/* Editorial Lifestyle Hero Image */}
        <img
          src={desktopUrl || FALLBACK_IMAGES.desktop}
          alt="Handcrafted slow-fashion crochet collection"
          loading="eager"
          className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
        />
        <img
          src={mobileUrl || FALLBACK_IMAGES.mobile}
          alt="Handcrafted crochet bouquet collection"
          loading="eager"
          className="absolute inset-0 block h-full w-full object-cover object-center md:hidden"
        />

        {/* Gradient Overlay for crisp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />

        {/* Content Container */}
        <div className="relative z-20 p-6 sm:p-10 md:p-14 lg:p-16 max-w-xl text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#fe9400] text-[#633700] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 fill-current" />
            <span>Artisan Made to Order</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] text-[#fcf9f8] mb-3 md:mb-4">
            Handcrafted Warmth & Grace
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[#fcf9f8]/90 font-normal leading-relaxed mb-6 max-w-md">
            Discover premium, slow-fashion crochet pieces designed to bring timeless comfort, delicate textures, and artisanal elegance to your everyday life.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="#trending"
              className="inline-flex items-center justify-center gap-2 bg-[#ff6b9d] text-white text-xs sm:text-sm font-bold uppercase tracking-wider px-6 sm:px-8 py-3 rounded-full pink-glow hover:bg-[#e63a73] transition-all duration-300 active:scale-95"
            >
              <span>Explore Collections</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/custom-order"
              className="inline-flex items-center justify-center bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-full hover:bg-white/30 transition-colors"
            >
              Custom Request
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
