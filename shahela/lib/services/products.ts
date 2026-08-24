import { createClient } from '@/lib/supabase/server'
import { cache, TTL } from '@/lib/redis'
import type { Product, ProductWithRelations, PaginatedResponse, CategorySection } from '@/types'

export interface GetProductsParams {
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
}

export async function getProducts(
  params: GetProductsParams = {}
): Promise<PaginatedResponse<ProductWithRelations>> {
  const {
    categoryId,
    categorySlug,
    isFeatured,
    isBestseller,
    search,
    minPrice,
    maxPrice,
    sort = 'newest',
    page = 1,
    limit = 12,
  } = params

  const supabase = await createClient()

  let resolvedCategoryId = categoryId
  if (!resolvedCategoryId && categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()
    if (cat) resolvedCategoryId = cat.id
  }

  let query = supabase
    .from('products')
    .select(
      `
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `,
      { count: 'exact' }
    )
    .eq('is_active', true)

  if (resolvedCategoryId) {
    query = query.eq('category_id', resolvedCategoryId)
  }

  if (isFeatured !== undefined) {
    query = query.eq('is_featured', isFeatured)
  }

  if (isBestseller !== undefined) {
    query = query.eq('is_bestseller', isBestseller)
  }

  if (minPrice !== undefined) {
    query = query.gte('base_price', minPrice)
  }

  if (maxPrice !== undefined) {
    query = query.lte('base_price', maxPrice)
  }

  if (search && search.trim().length > 0) {
    query = query.or(
      `name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
    )
  }

  switch (sort) {
    case 'price_asc':
      query = query.order('base_price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('base_price', { ascending: false })
      break
    case 'popular':
      query = query.order('is_bestseller', { ascending: false }).order('created_at', { ascending: false })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    return { data: [], total: 0, page, limit, totalPages: 0 }
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: (data as unknown as ProductWithRelations[]) || [],
    total,
    page,
    limit,
    totalPages,
  }
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const cacheKey = cache.keys.productDetail(slug)
  const cached = await cache.get<ProductWithRelations>(cacheKey)
  if (cached) return cached

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  // Sort images by display_order
  const productData = data as any
  if (productData?.images && Array.isArray(productData.images)) {
    productData.images.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
  }

  await cache.set(cacheKey, productData, TTL.PRODUCT_DETAIL)
  return productData as ProductWithRelations
}

export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `
    )
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as unknown as ProductWithRelations
}
