'use client'

import { create } from 'zustand'
import type { ProductImage } from '@/types'

export interface ProductFormState {
  isNew: boolean
  productId: string | null

  name: string
  slug: string
  description: string
  short_description: string
  base_price: number | null
  discount_price: number | null
  category_id: string
  lead_time_days: number
  is_available: boolean
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  seo_title: string
  seo_description: string

  images: ProductImage[]
  collection_ids: string[]

  setField: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  initFromProduct: (product: {
    id: string
    name: string
    slug: string
    description: string
    short_description: string | null
    base_price: number
    discount_price: number | null
    category_id: string
    lead_time_days: number
    is_available: boolean
    is_active: boolean
    is_featured: boolean
    is_bestseller: boolean
    seo_title: string | null
    seo_description: string | null
    collection_ids?: string[]
    images?: ProductImage[]
  }) => void
  reset: () => void
}

const initialState = {
  isNew: true,
  productId: null as string | null,
  name: '',
  slug: '',
  description: '',
  short_description: '',
  base_price: null as number | null,
  discount_price: null as number | null,
  category_id: '',
  lead_time_days: 12,
  is_available: true,
  is_active: true,
  is_featured: false,
  is_bestseller: false,
  seo_title: '',
  seo_description: '',
  images: [] as ProductImage[],
  collection_ids: [] as string[],
}

export const useProductFormStore = create<ProductFormState>()((set) => ({
  ...initialState,

  setField: (key, value) => set({ [key]: value }),

  initFromProduct: (product) =>
    set({
      isNew: false,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      short_description: product.short_description ?? '',
      base_price: product.base_price,
      discount_price: product.discount_price,
      category_id: product.category_id,
      lead_time_days: product.lead_time_days,
      is_available: product.is_available,
      is_active: product.is_active,
      is_featured: product.is_featured,
      is_bestseller: product.is_bestseller,
      seo_title: product.seo_title ?? '',
      seo_description: product.seo_description ?? '',
      collection_ids: product.collection_ids ?? [],
      images: product.images ?? [],
    }),

  reset: () => set(initialState),
}))
