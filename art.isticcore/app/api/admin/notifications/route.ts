import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/notifications — actionable items for the admin bell:
 *  - Orders waiting for the next pipeline move (pending / confirmed)
 *  - Cancelled prepaid orders still waiting on a manual Razorpay refund
 *  - New custom design requests (status = NEW)
 *
 * No new tables — these are live counts derived from existing rows, so the
 * bell always reflects the current truth. No money automation is implied.
 */
export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const orderFields = `
      id, order_number, status, payment_status, total, payment_method, created_at,
      user:users(id,name,email)
    `

    const [activeOrders, refundsPending, customRequests] = await Promise.all([
      supabase
        .from('orders')
        .select(orderFields)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('orders')
        .select(orderFields)
        .eq('status', 'cancelled')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('custom_design_requests')
        .select('id, name, contact, email, created_at')
        .eq('status', 'NEW')
        .order('created_at', { ascending: false })
        .limit(15),
    ])

    const counts = {
      activeOrders: activeOrders.data?.length ?? 0,
      refundsPending: refundsPending.data?.length ?? 0,
      customRequests: customRequests.data?.length ?? 0,
    }

    return NextResponse.json({
      total: counts.activeOrders + counts.refundsPending + counts.customRequests,
      counts,
      activeOrders: activeOrders.data ?? [],
      refundsPending: refundsPending.data ?? [],
      customRequests: customRequests.data ?? [],
    })
  } catch (error: unknown) {
    console.error('API /api/admin/notifications GET error:', error)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }
}