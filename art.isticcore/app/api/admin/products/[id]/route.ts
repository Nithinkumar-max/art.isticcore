import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { ProductSchema } from '@/lib/validations'
import { cache } from '@/lib/redis'

// GET /api/admin/products/[id] — admin can fetch any product (even inactive)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)')
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // also fetch collections for this product
    const { data: collLinks } = await supabase.from('collection_products').select('collection_id').eq('product_id', id)
    const collectionIds = (collLinks ?? []).map((r: { collection_id: string }) => r.collection_id)
    return NextResponse.json({ ...data, collection_ids: collectionIds })
  } catch (e) {
    console.error('GET /api/admin/products/[id] error:', e)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

// PATCH /api/admin/products/[id] — update product + collection mappings
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const body = await request.json()

    // Allow collection_ids alongside product fields
    const { collection_ids, ...productBody } = body as { collection_ids?: string[] } & Record<string, unknown>

    const parsed = ProductSchema.partial().safeParse(productBody)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid product data' }, { status: 400 })
    }

    const supabase = createAdminClient()
    // Validate product exists
    const { data: existing, error: fetchErr } = await supabase.from('products').select('id').eq('id', id).single()
    if (fetchErr || !existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // Prepare update payload — only include provided keys
    const updatePayload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) updatePayload[k] = v
    }
    if (Object.keys(updatePayload).length) {
      updatePayload['updated_at'] = new Date().toISOString()
      const { error: updErr } = await supabase.from('products').update(updatePayload).eq('id', id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })
    }

    // Handle collection mappings if provided
    if (Array.isArray(collection_ids)) {
      // Validate collection ids exist
      if (collection_ids.length) {
        const { data: cols } = await supabase.from('collections').select('id').in('id', collection_ids)
        const validIds = new Set((cols ?? []).map((c: { id: string }) => c.id))
        const invalid = collection_ids.filter((cid) => !validIds.has(cid))
        if (invalid.length) return NextResponse.json({ error: `Invalid collection ids: ${invalid.join(', ')}` }, { status: 400 })
      }
      // Replace mappings atomically
      await supabase.from('collection_products').delete().eq('product_id', id)
      if (collection_ids.length) {
        const rows = collection_ids.map((cid, idx) => ({ collection_id: cid, product_id: id, display_order: idx }))
        const { error: insErr } = await supabase.from('collection_products').insert(rows)
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
      }
    }

    await cache.invalidatePrefix('products:')

    const { data: updated } = await supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)')
      .eq('id', id)
      .single()

    return NextResponse.json({ success: true, product: updated })
  } catch (e) {
    console.error('PATCH /api/admin/products/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const supabase = createAdminClient()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await cache.invalidatePrefix('products:')
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/admin/products/[id] error:', e)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
