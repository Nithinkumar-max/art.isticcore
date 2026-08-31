import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { cache } from '@/lib/redis'

const attachSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  images: z
    .array(
      z.object({
        url: z.string().url('Invalid image URL'),
        alt_text: z.string().max(200).nullish(),
        display_order: z.number().int().min(0).optional(),
        is_primary: z.boolean().optional(),
      }),
    )
    .min(1, 'At least one image is required')
    .max(10, 'Maximum 10 images'),
})

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = attachSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const { productId, images } = parsed.data

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .single()
    if (prodErr || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const rows = images.map((image, index) => ({
      product_id: productId,
      url: image.url,
      alt_text: image.alt_text ?? null,
      display_order: image.display_order ?? index + 1,
      is_primary: image.is_primary ?? index === 0,
    }))

    const { error: insertErr } = await supabase.from('product_images').insert(rows)
    if (insertErr) {
      console.error('Attach images failed:', insertErr)
      return NextResponse.json({ error: 'Could not attach images' }, { status: 500 })
    }

    await cache.invalidatePrefix('products:')

    return NextResponse.json({ success: true, count: rows.length }, { status: 201 })
  } catch (error: unknown) {
    console.error('API /api/admin/products/images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
