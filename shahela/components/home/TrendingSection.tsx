'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface CollectionCategory {
  id: string
  name: string
  slug: string
}

const DEFAULT_CATEGORIES: CollectionCategory[] = [
  { id: 'all', name: 'All Pieces', slug: '' },
  { id: 'sweaters', name: 'Chunky Sweaters', slug: 'sweaters' },
  { id: 'blankets', name: 'Plush Blankets', slug: 'blankets' },
  { id: 'tops', name: 'Summer Tops & Lace', slug: 'summer-tops' },
  { id: 'bouquets', name: 'Artisan Bouquets', slug: 'bouquets' },
  { id: 'amigurumi', name: 'Amigurumi & Charms', slug: 'amigurumi' },
  { id: 'bags', name: 'Boho Bags & Totes', slug: 'bags' },
  { id: 'decor', name: 'Home Decor', slug: 'home-decor' },
]

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
    }
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
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = selected === cat.slug
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.slug)}
                className={`snap-start flex-none px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'bg-[#ac2a5d] text-white shadow-sm ring-2 ring-[#ac2a5d] ring-offset-2'
                    : 'bg-white text-[#1c1b1b] border border-[#d4d4d4] hover:border-[#ac2a5d] hover:text-[#ac2a5d] hover:bg-[#fff0f5]'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
