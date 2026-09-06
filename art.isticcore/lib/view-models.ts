import type { ProductWithRelations } from '@/types'

export interface ProductVariantCard {
  id: string
  name: string
  price: number
  compareAtPrice?: number
  leadTimeDays?: number
}

/** View model consumed by storefront card/detail components. */
export interface ProductCardModel {
  id: string
  name: string
  slug: string
  category: string
  categorySlug: string
  description: string
  shortDescription: string
  price: number
  compareAtPrice?: number
  rating?: number
  reviewCount?: number
  badge?: string
  leadTimeDays: number
  imageUrl: string
  gallery: string[]
  variants: ProductVariantCard[]
  isActive: boolean
  isBestseller: boolean
}

const FALLBACK_IMAGE = '/images/product-placeholder.svg'

export function mapProductToCard(product: ProductWithRelations): ProductCardModel {
  const firstImage = product.images?.[0]?.url || FALLBACK_IMAGE
  const record = product as unknown as Record<string, unknown>
  const ratingAvg = typeof record.rating_avg === 'number' ? record.rating_avg : undefined
  const ratingCount = typeof record.rating_count === 'number' ? record.rating_count : undefined

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category?.name || 'Handcrafted',
    categorySlug: product.category?.slug || 'handcrafted',
    description: product.description,
    shortDescription: product.short_description || 'A carefully made Art.isticcore original.',
    price: product.discount_price ?? product.base_price,
    compareAtPrice: product.discount_price ? product.base_price : undefined,
    rating: ratingAvg,
    reviewCount: ratingCount,
    badge: product.is_bestseller ? 'Bestseller' : product.is_featured ? 'Featured' : undefined,
    leadTimeDays: product.lead_time_days || 12,
    imageUrl: firstImage,
    gallery: product.images?.map((image) => image.url) || [firstImage],
    variants:
      product.variants?.map((variant) => ({
        id: variant.id,
        name: variant.name,
        price: variant.discount_price ?? variant.price,
        compareAtPrice: variant.discount_price ? variant.price : undefined,
        leadTimeDays: variant.lead_time_days || product.lead_time_days,
      })) || [],
    isActive: product.is_active,
    isBestseller: product.is_bestseller,
  }
}
