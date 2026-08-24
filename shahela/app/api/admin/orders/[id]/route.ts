import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth'
import { updateOrderStatus } from '@/lib/services/orders'

const patchSchema = z.object({
  status: z.enum([
    'PLACED', 'PAYMENT_PENDING', 'CONFIRMED',
    'IN_PRODUCTION', 'QUALITY_CHECK', 'PACKED',
    'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'CANCELLED', 'REFUNDED',
  ]),
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().max(500).optional(),
  courierName: z.string().max(100).optional(),
  adminNote: z.string().max(2000).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Role verified against public.users — never user_metadata.
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: z.treeifyError(parsed.error) },
        { status: 400 }
      )
    }
    const { status, trackingNumber, trackingUrl, courierName, adminNote } = parsed.data

    const updated = await updateOrderStatus({
      orderId: id,
      status,
      trackingNumber,
      trackingUrl,
      courierName,
      adminNote,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error: unknown) {
    console.error('API /api/admin/orders/[id] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
