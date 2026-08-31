import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getOrderById, getOrderByNumber } from '@/lib/services/orders'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check by ID or order_number
    let order = await getOrderById(id)
    if (!order) {
      order = await getOrderByNumber(id)
    }

    // Ownership check: customers may only read their own orders.
    // Return 404 (not 403) so order existence isn't leaked.
    const isOwner = order?.user_id && order.user_id === session.id
    if (!order || (!isOwner && session.role === 'CUSTOMER')) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error: unknown) {
    console.error('API /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 })
  }
}
