'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCategories } from '@/lib/hooks/useCategories'

export interface CollectionCategory {
  id: string
  name: string
  slug: string
  image_url?: string | null
}

const ALL_PILL: CollectionCategory = { id: 'all', name: 'All Pieces', slug: '' }

interface TrendingSectionProps {
  activeCategory?: string
  onSelectCategory?: (slug: string) => void
}

export function TrendingSection({
  activeCategory = '',
  onSelectCategory,
}: TrendingSectionProps) {
  const [selected, setSelected] = useState(activeCategory)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { data, isLoading } = useCategories()

  const pills =
    data && data.length > 0
      ? [ALL_PILL, ...data.map((cat) => ({ id: cat.id, name: cat.name, slug: cat.slug, image_url: cat.image_url }))]
      : []

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleSelect = (slug: string) => {
    setSelected(slug)
    if (onSelectCategory) {
      onSelectCategory(slug)
      return
    }
    router.push(slug ? `/shop?category=${encodeURIComponent(slug)}` : '/shop')
  }

  return (
    <section id="trending" className="py-10 md:py-14 bg-[#fff9f0] border-y border-[#eae7e7]/60">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header with Title & Arrow controls */}
        <div className="flex justify-between items-end mb-6">
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
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="w-10 h-10 rounded-full border border-[#d4d4d4] bg-white flex items-center justify-center text-[#574146] hover:text-[#ac2a5d] hover:border-[#ac2a5d] shadow-2xs transition-colors active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Pills */}
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden pb-2" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="flex-none h-[52px] w-32 rounded-full bg-white border border-[#d4d4d4]/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {pills.map((cat) => {
              const isSelected = selected === cat.slug
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.slug)}
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
    </section>
  )
}
