'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCategories } from '@/lib/hooks/useCategories'
import { mapProductToCard } from '@/lib/view-models'
import { ProductCard } from '@/components/storefront/StorefrontPrimitives'
import type { ProductWithRelations, PaginatedResponse } from '@/types'

const PRODUCTS_PER_CATEGORY = 4

const EXCLUDED_SLUGS = ['custom-orders']

interface CategoryPill {
  id: string
  name: string
  slug: string
  image_url?: string | null
}

const ALL_PILL: CategoryPill = { id: 'all', name: 'All Pieces', slug: '' }

export function TrendingSection() {
  const [selected, setSelected] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { data: categories, isLoading: categoriesLoading } = useCategories()

  // Drop categories we never want surfaced on the homepage (e.g. Custom Orders)
  const activeCategories = (categories ?? []).filter((cat) => !EXCLUDED_SLUGS.includes(cat.slug))

  const pillars: CategoryPill[] =
    activeCategories.length > 0
      ? [ALL_PILL, ...activeCategories.map((cat) => ({ id: cat.id, name: cat.name, slug: cat.slug, image_url: cat.image_url }))]
      : []

  const categoryQueries = useQueries({
    queries:
      activeCategories.length > 0 && !categoriesLoading
        ? activeCategories.map((cat) => ({
            queryKey: ['products', { categorySlug: cat.slug, limit: PRODUCTS_PER_CATEGORY, sort: 'popular' }],
            queryFn: async (): Promise<PaginatedResponse<ProductWithRelations>> => {
              const params = new URLSearchParams({
                categorySlug: cat.slug,
                limit: String(PRODUCTS_PER_CATEGORY),
                sort: 'popular',
              })
              const res = await fetch(`/api/products?${params.toString()}`)
              if (!res.ok) throw new Error('Failed to load products')
              return res.json()
            },
            staleTime: 1000 * 60 * 60,
          }))
        : [],
  })

  const isLoading = categoriesLoading || categoryQueries.some((q) => q.isLoading)

  if (!categoriesLoading && activeCategories.length === 0) return null

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Categories with at least one product
  const populated = activeCategories
    .map((cat, idx) => ({
      cat,
      products: categoryQueries[idx]?.data?.data ?? [],
    }))
    .filter((entry) => entry.products.length > 0)

  // Which category rows to show
  const visibleRows = selected === '' ? populated : populated.filter((entry) => entry.cat.slug === selected)

  return (
    <section id="trending" className="py-10 md:py-14 bg-[#fff9f0] border-y border-[#eae7e7]/60">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header with Title & Arrow controls */}
        <div className="flex justify-between items-end mb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8c5000]">
              Handcrafted Categories
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1c1b1b] mt-1 font-semibold">
              Trending Collections
            </h2>
          </div>

          <div className="hidden sm:flex gap-2">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="w-10 h-10 rounded-full border border-[#d4d4d4] bg-white flex items-center justify-center text-[#574146] hover:text-[#ac2a5d] hover:border-[#ac2a5d] shadow-2xs transition-colors active:scale-95"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="w-10 h-10 rounded-full border border-[#d4d4d4] bg-white flex items-center justify-center text-[#574146] hover:text-[#ac2a5d] hover:border-[#ac2a5d] shadow-2xs transition-colors active:scale-95"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Pill Bar */}
        <div className="mb-8">
          {categoriesLoading ? (
            <div className="flex gap-3 overflow-hidden" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="flex-none h-[52px] w-32 rounded-full bg-white border border-[#d4d4d4]/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
            >
              {pillars.map((cat) => {
                const isSelected = selected === cat.slug
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelected(cat.slug)}
                    className={`snap-start flex-none flex items-center gap-2.5 pl-2 pr-5 sm:pr-6 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? 'bg-[#ac2a5d] text-white shadow-sm ring-2 ring-[#ac2a5d] ring-offset-2'
                        : 'bg-white text-[#1c1b1b] border border-[#d4d4d4] hover:border-[#ac2a5d] hover:text-[#ac2a5d] hover:bg-[#fff0f5]'
                    }`}
                  >
                    {cat.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.image_url}
                        alt=""
                        loading="lazy"
                        className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                      />
                    ) : null}
                    {cat.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Product Grids — filtered by selected pill */}
        {isLoading && visibleRows.length === 0 ? (
          <div className="space-y-10">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-6 w-40 rounded bg-[#d4d4d4]/40 animate-pulse mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="rounded-[24px] bg-white/60 border border-[#d4d4d4]/30 animate-pulse">
                      <div className="aspect-[4/5] rounded-[20px] bg-[#d4d4d4]/20" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 w-16 rounded bg-[#d4d4d4]/30" />
                        <div className="h-4 w-3/4 rounded bg-[#d4d4d4]/30" />
                        <div className="h-3 w-12 rounded bg-[#d4d4d4]/30" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {visibleRows.map((entry) => (
              <div key={entry.cat.id}>
                <div className="flex items-end justify-between mb-4">
                  <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#1c1b1b]">
                    {entry.cat.name}
                  </h3>
                  <Link
                    href={`/shop?category=${encodeURIComponent(entry.cat.slug)}`}
                    className="group/link inline-flex items-center gap-1 text-sm font-semibold text-[#ac2a5d] hover:text-[#8c1a45] transition-colors"
                  >
                    View more
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
                  {entry.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={mapProductToCard(product)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* "View All" for the combined "All Pieces" selection */}
            {selected === '' && visibleRows.length > 0 && (
              <div className="pt-2 flex justify-center">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-full border border-[#ac2a5d] bg-white px-8 py-3 text-sm font-semibold text-[#ac2a5d] transition-all hover:bg-[#ac2a5d] hover:text-white active:scale-95"
                >
                  View all pieces
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}