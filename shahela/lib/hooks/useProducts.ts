'use client'

import { useQuery } from '@tanstack/react-query'
import type { ProductWithRelations, PaginatedResponse, CategorySection } from '@/types'

export interface UseProductsOptions {
  categoryId?: string
  categorySlug?: string
  section?: CategorySection
  isFeatured?: boolean
  isBestseller?: boolean
  search?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular'
  page?: number
  limit?: number
  initialData?: PaginatedResponse<ProductWithRelations>
}

export function useProducts(options: UseProductsOptions = {}) {
  const {
    categoryId,
    categorySlug,
    section,
    isFeatured,
    isBestseller,
    search,
    minPrice,
    maxPrice,
    sort = 'newest',
    page = 1,
    limit = 12,
    initialData,
  } = options

  return useQuery<PaginatedResponse<ProductWithRelations>>({
    queryKey: [
      'products',
      {
        categoryId,
        categorySlug,
        section,
        isFeatured,
        isBestseller,
        search,
        minPrice,
        maxPrice,
        sort,
        page,
        limit,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (categoryId) params.set('categoryId', categoryId)
      if (categorySlug) params.set('categorySlug', categorySlug)
      if (section) params.set('section', section)
      if (isFeatured !== undefined) params.set('isFeatured', String(isFeatured))
      if (isBestseller !== undefined) params.set('isBestseller', String(isBestseller))
      if (search) params.set('search', search)
      if (minPrice !== undefined) params.set('minPrice', String(minPrice))
      if (maxPrice !== undefined) params.set('maxPrice', String(maxPrice))
      if (sort) params.set('sort', sort)
      if (page) params.set('page', String(page))
      if (limit) params.set('limit', String(limit))

      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load products')
      return res.json()
    },
    initialData,
  })
}

export function useProduct(slug: string, initialData?: ProductWithRelations) {
  return useQuery<ProductWithRelations>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`)
      if (!res.ok) throw new Error('Product not found')
      return res.json()
    },
    initialData,
    enabled: !!slug,
  })
}
