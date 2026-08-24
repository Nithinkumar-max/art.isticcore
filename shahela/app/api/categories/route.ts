import { NextRequest, NextResponse } from 'next/server'
import { getCategories } from '@/lib/services/categories'
import type { CategorySection } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = (searchParams.get('section') as CategorySection) || undefined
    const categories = await getCategories(section)

    return NextResponse.json(categories)
  } catch (error: unknown) {
    console.error('API /api/categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
