import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { generateOrderDocument, type DocumentType } from '@/lib/documents'
import type { OrderWithItems } from '@/types'

/**
 * GET /api/admin/orders/[id]/documents?type=invoice|packing|label|all
 *
 * Generates the requested order document(s) server-side using the service-role
 * Supabase client (bypasses RLS), so the full hydrated order (items, address,
 * payment, user) is always available to the renderers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const typeParam = request.nextUrl.searchParams.get('type') ?? 'all'
    const type = (['invoice', 'packing', 'label', 'all'].includes(typeParam) ? typeParam : 'all') as DocumentType

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items(
          *,
          product:products(id,name,slug)
        ),
        address:addresses(*),
        payment:payments(*),
        user:users(id,name,email,phone)
      `
      )
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = data as unknown as OrderWithItems
    const generated = await generateOrderDocument(order, type)

    return new NextResponse(generated.buffer, {
      headers: {
        'Content-Type': generated.contentType,
        'Content-Disposition': `attachment; filename="${generated.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    console.error('API /api/admin/orders/[id]/documents GET error:', error)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}