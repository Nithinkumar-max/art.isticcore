import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/orders — full order list for the admin board.
 * Optional ?status= filter (e.g. ?status=cancelled) for the cancelled view.
 * Role verified against public.users via isAdmin().
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get('status')
    const filters: Record<string, string> = {}
    if (status) filters.status = status

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
      `,
      )
      .match(filters)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('GET /api/admin/orders error:', error)
      return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error: unknown) {
    console.error('API /api/admin/orders GET error:', error)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
