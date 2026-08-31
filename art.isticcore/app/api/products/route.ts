import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/services/products'
import type { CategorySection } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const categoryId = searchParams.get('categoryId') || undefined
    const categorySlug = searchParams.get('categorySlug') || undefined
    const section = (searchParams.get('section') as CategorySection) || undefined
    const isFeatured = searchParams.has('isFeatured') ? searchParams.get('isFeatured') === 'true' : undefined
    const isBestseller = searchParams.has('isBestseller') ? searchParams.get('isBestseller') === 'true' : undefined
    const search = searchParams.get('search') || undefined
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
    const sort = (searchParams.get('sort') as 'price_asc' | 'price_desc' | 'newest' | 'popular') || 'newest'
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 12

    const result = await getProducts({
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
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('API /api/products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
