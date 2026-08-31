import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { ProductSchema } from '@/lib/validations'
import { cache } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    // Role verified against public.users — never user_metadata.
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const parsed = ProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid product data' }, { status: 400 })
    }

    const {
      name,
      slug,
      description,
      short_description,
      base_price,
      discount_price,
      category_id,
      lead_time_days,
      is_featured,
      is_bestseller,
      seo_title,
      seo_description,
    } = parsed.data

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .insert({
        name,
        slug,
        description,
        short_description: short_description || null,
        base_price,
        discount_price: discount_price || null,
        category_id,
        lead_time_days,
        is_featured,
        is_bestseller,
        seo_title: seo_title || null,
        seo_description: seo_description || null,
      })
      .select()
      .single()

    if (prodErr || !product) {
      return NextResponse.json({ error: prodErr?.message || 'Failed to create product' }, { status: 400 })
    }

    // Invalidate product caches
    await cache.invalidatePrefix('products:')

    return NextResponse.json({ success: true, product })
  } catch (error: unknown) {
    console.error('API /api/admin/products POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
