'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { Heart, Star, ShoppingBag, ArrowRight, Check } from 'lucide-react'
import type { ProductWithRelations } from '@/types'

// Curated Showcase Products from the Artisanal Grace Lookbook
const FALLBACK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Oatmeal Dream Sweater',
    slug: 'oatmeal-dream-sweater',
    price: 3499,
    discountPrice: null,
    leadTimeDays: 14,
    rating: 4.9,
    reviewsCount: 28,
    isBestseller: false,
    badge: null,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAr9YsqPsamrihCG2Xr4MkAfoeNe2E3d-hzxsXOH7LNil1rZYHPFttVQJcpoz9XOBBM61OSDEodQua9skxhJ9FNDA_ZeOvXWY6FHfotdi1aHi12W4RD1UbjADQO5vBdrD4wGhHOnM-6M7CjfHeOpP5nspQGo7gXpczV7UFBrgZJ1nl31UmMWwI5tZK57tVSxlQsQzK-76o5xe3PCIKeeoU7KNY8InzUDaCDbAsAApKWm5k_CnaRCADkWw',
  },
  {
    id: 'prod-2',
    name: 'Berry Bliss Chunky Throw',
    slug: 'berry-bliss-chunky-throw',
    price: 4299,
    discountPrice: 4999,
    leadTimeDays: 15,
    rating: 5.0,
    reviewsCount: 42,
    isBestseller: true,
    badge: 'Bestseller',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBkhb-B_Bf4RaymTmV_tfP9OY0Nl-tlTrmXkgvh7GLTyl3v73KZkMvT_0siXrAhKSUlShuzUPWNhPCX6Q9NsgEzYru-7poIuhVtcL9tWZJ4qdfApoh4meKdkMiGRXfJg8Xq4P8MZuHVrQXS-rUStutm-DuYuwgQrs2W4JmYGCBn_jAGUA1Id0gQ1hbYgCRcBwqqUGybH87RxXUIntc5pN_L6TQwm-BvMJnthSronS_9IFcPuj83oMY-2Q',
  },
  {
    id: 'prod-3',
    name: 'Market Day Boho Floral Tote',
    slug: 'market-day-boho-floral-tote',
    price: 1899,
    discountPrice: null,
    leadTimeDays: 8,
    rating: 4.8,
    reviewsCount: 35,
    isBestseller: false,
    badge: 'Trending',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCSBRu3HM_MzghSREwzpiRpwUiupbg3NxHjlLJXXPvFhF4B2jGBm-9ER7ByTWffSEl6drOkaO9yWKP0r0NyyhAY8E-3V9KEeLtRUq0ZQUYYfJ1gcl0r5-J5qViFnVzIJEvTq2pvwxIG6xcrwTpv4jQ_Fcsf5F_mz7yyaGvIG3bvYP_jOL9LAmFgk5UsSjbNh7cOcPfxZwCNzCoIEfiyK_0MKr8ml6CmjpVfd_eLluB0nz4T8J7P2-GG3Q',
  },
  {
    id: 'prod-4',
    name: 'Blush Intricate Lace Camisole',
    slug: 'blush-intricate-lace-camisole',
    price: 2499,
    discountPrice: null,
    leadTimeDays: 10,
    rating: 4.9,
    reviewsCount: 19,
    isBestseller: false,
    badge: 'Popular',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAmV54LUv9hc_R3XfJN2s5OUEHw_TmwICyv5ekGU5AsWvs1UQo0EjfIdGb2w6g7EGuLQ3WLqlUpyokt1ZnTclrWtVBbvARUPwKCpynplfAd-5j-svq_Vu6mwtmResFq4IMuvN9cCqcNBMGVOFrK8TjKwcKMwLoGcaI-agZmAjN0LGSomlqCOTn4gJLFMYXqTq5aKIpiTDH52_T7OsLzMbufN0racn2o2VKP4_xZ5xKFGzMcgsJFLjY3Yg',
  },
  {
    id: 'prod-5',
    name: 'Sunflower Cheer Pocket Charm',
    slug: 'sunflower-cheer-pocket-charm',
    price: 799,
    discountPrice: 649,
    leadTimeDays: 5,
    rating: 4.9,
    reviewsCount: 64,
    isBestseller: true,
    badge: 'Bestseller',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDgbW28ZPHWaWFCt3brWfyLTtBdn92LSCj8GIPK3UqcZ3Fi7lymSF_oOt0kg8k610sezAPHFhdEeEZhfCc6zYCEGM9XGUTyH0B15NimMU5hTMfdM6TF4Jd7a1UR2j6L_dISSmkSYp6SUu4vWqU0C0w5p4AKg6DO5uvwAfsLomRzyBBAr9V8lAMEtPA3P_GjyuK2KXIO-2lQjydJ3uH0CE9Q8tfE1x_dQGn1D5MKUOf0wRb5XFz8P_6phg',
  },
  {
    id: 'prod-6',
    name: 'Everlasting Rose Blossom Bouquet',
    slug: 'everlasting-rose-blossom-bouquet',
    price: 1999,
    discountPrice: null,
    leadTimeDays: 7,
    rating: 5.0,
    reviewsCount: 51,
    isBestseller: false,
    badge: 'Artisan Pick',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAn0zqlFyhf0yTe0mc_QtubR1nILpzXdZA9uzeb-XxYIhro2dfBH0N2gamPwem72BPnzqYfugiH1WHqelrTFYuUH1JgkaNrcaBuQObgEccUWG0cxGKOOHqdD6_71LzRA6CEl01tJ_6KW1uMpc3V77-rYDQ-oaV9rbA7IplsNE7_PXpzjbTnMBtXAlWdDU2JRT2NHGae6Li6W-asVg2E0dxEh6csE1XeuopkC5II_c77Wt_kAt_chugaFQ',
  },
  {
    id: 'prod-7',
    name: 'Pastel Meadow Cardigan',
    slug: 'pastel-meadow-cardigan',
    price: 3899,
    discountPrice: null,
    leadTimeDays: 14,
    rating: 4.8,
    reviewsCount: 16,
    isBestseller: false,
    badge: null,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCzjnkXgIWuLfWYFdSfMSPa0JWOwN2CydFETlgmvNhvrK8Uftp9zDtj3XhE26FEw9t2i218mcKWkwDD3oc9O_3fCo4UypPFSuTxFbsgaVi23VIWJJVvKb1KQ7GwqUOpqTFqAN_2ChhgP8CQPQUmQWnfYcq2-t9K945JWiPO8eqpA28Kmk6VDzOadGSj82Q6V6TNmjJVUNPo6NU9rDh2aPPZeN3cywT4M9fZq1dYBv3uXoxT3bRtzZGHA',
  },
  {
    id: 'prod-8',
    name: 'Cozy Woven Infinity Scarf',
    slug: 'cozy-woven-infinity-scarf',
    price: 1499,
    discountPrice: 1299,
    leadTimeDays: 6,
    rating: 4.9,
    reviewsCount: 22,
    isBestseller: false,
    badge: null,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAr9YsqPsamrihCG2Xr4MkAfoeNe2E3d-hzxsXOH7LNil1rZYHPFttVQJcpoz9XOBBM61OSDEodQua9skxhJ9FNDA_ZeOvXWY6FHfotdi1aHi12W4RD1UbjADQO5vBdrD4wGhHOnM-6M7CjfHeOpP5nspQGo7gXpczV7UFBrgZJ1nl31UmMWwI5tZK57tVSxlQsQzK-76o5xe3PCIKeeoU7KNY8InzUDaCDbAsAApKWm5k_CnaRCADkWw',
  },
]

interface BestsellersSectionProps {
  products?: ProductWithRelations[]
}

export function BestsellersSection({ products }: BestsellersSectionProps) {
  const addItem = useCartStore((state) => state.addItem)
  const [wishlisted, setWishlisted] = useState<Record<string, boolean>>({})
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({})

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlisted((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAddToCart = (
    item: {
      id: string
      name: string
      price: number
      imageUrl: string
      leadTimeDays: number
    },
    e: React.MouseEvent
  ) => {
    e.preventDefault()
    e.stopPropagation()

    addItem({
      id: `cart-${item.id}-${Date.now()}`,
      productId: item.id,
      
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      quantity: 1,
      customNote: null,
      leadTimeDays: item.leadTimeDays,
    })

    setAddedIds((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }))
    }, 1500)
  }

  // Use DB products if passed, else fallback
  const displayItems =
    products && products.length > 0
      ? products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.discount_price ?? p.base_price,
          discountPrice: p.discount_price ? p.base_price : null,
          leadTimeDays: p.lead_time_days ?? 12,
          rating: 4.9,
          reviewsCount: 15,
          isBestseller: p.is_bestseller,
          badge: p.is_bestseller ? 'Bestseller' : p.is_featured ? 'Featured' : null,
          imageUrl: p.images?.[0]?.url || '/placeholder-product.webp',
        }))
      : FALLBACK_PRODUCTS

  return (
    <section id="bestsellers" className="py-14 md:py-20 max-w-[1280px] mx-auto px-4 sm:px-6">
      {/* Title Bar */}
      <div className="flex justify-between items-end mb-8 md:mb-12">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ac2a5d]">
            Artisan Favorites
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1c1b1b] font-semibold mt-1">
            Bestsellers & Made to Order
          </h2>
        </div>

        <Link
          href="#trending"
          className="text-xs sm:text-sm font-semibold text-[#ac2a5d] hover:text-[#e63a73] flex items-center gap-1 transition-colors group"
        >
          <span>View All</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Product Grid: 2 cols on mobile, 3 on md, 4 on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
        {displayItems.map((product) => {
          const isFav = wishlisted[product.id]
          const isAdded = addedIds[product.id]

          return (
            <div
              key={product.id}
              className="group bg-white rounded-[24px] sm:rounded-[30px] p-2.5 sm:p-3 soft-shadow hover:soft-shadow-hover transition-all duration-300 hover:scale-[1.015] flex flex-col border border-[#f0eded]"
            >
              {/* Product Image Container */}
              <div className="relative w-full aspect-[4/5] rounded-[20px] sm:rounded-[24px] overflow-hidden bg-[#f6f3f2]">
                <img
                  src={product.imageUrl}
                  alt={`${product.name}, handcrafted crochet product`}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />

                {/* Badge */}
                {product.badge && (
                  <span className="absolute top-2.5 left-2.5 z-10 bg-[#fe9400] text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                    {product.badge}
                  </span>
                )}

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={(e) => toggleWishlist(product.id, e)}
                  className="absolute top-2.5 right-2.5 z-10 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#574146] hover:text-[#ac2a5d] shadow-xs transition-transform active:scale-90"
                  aria-label="Wishlist item"
                >
                  <Heart
                    className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${
                      isFav ? 'fill-[#ac2a5d] text-[#ac2a5d]' : ''
                    }`}
                  />
                </button>

                {/* Lead time pill */}
                <div className="absolute bottom-2.5 left-2.5 z-10 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
                  ~{product.leadTimeDays}d craft time
                </div>
              </div>

              {/* Product Info */}
              <div className="pt-3 px-1 flex flex-col flex-grow justify-between">
                <div>
                  <h3 className="font-medium text-xs sm:text-sm text-[#1c1b1b] line-clamp-1 group-hover:text-[#ac2a5d] transition-colors">
                    {product.name}
                  </h3>

                  {/* Rating & Reviews */}
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 fill-[#fe9400] text-[#fe9400]" />
                    <span className="text-[11px] font-semibold text-[#1c1b1b]">
                      {product.rating}
                    </span>
                    <span className="text-[10px] text-[#574146]/70">
                      ({product.reviewsCount})
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="font-semibold text-sm sm:text-base text-[#ac2a5d]">
                      {formatPrice(product.price)}
                    </span>
                    {product.discountPrice && (
                      <span className="text-xs text-[#574146]/60 line-through">
                        {formatPrice(product.discountPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  type="button"
                  onClick={(e) => handleAddToCart(product, e)}
                  className={`mt-3.5 w-full py-2 sm:py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 ${
                    isAdded
                      ? 'bg-[#10b981] text-white shadow-xs'
                      : 'border border-[#d4d4d4] text-[#1c1b1b] hover:bg-[#fff0f5] hover:border-[#ff6b9d] hover:text-[#ac2a5d]'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Add to Bag</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
