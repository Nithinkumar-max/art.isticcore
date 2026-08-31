import { createClient } from '@/lib/supabase/server'
import { cache, TTL } from '@/lib/redis'
import type { Category, CategorySection } from '@/types'

export async function getCategories(section?: CategorySection): Promise<Category[]> {
  const cacheKey = section ? `categories:${section}` : cache.keys.categories()
  const cached = await cache.get<Category[]>(cacheKey)
  if (cached) return cached

  const supabase = await createClient()
  let query = supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (section) {
    query = query.eq('section', section)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Failed to fetch categories:', error)
    return []
  }

  await cache.set(cacheKey, data, TTL.CATEGORIES)
  return data
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}
