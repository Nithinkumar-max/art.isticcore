import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth'
import { updateOrderStatus } from '@/lib/services/orders'

const ORDER_STATUS_VALUES = [
  'confirmed', 'preparing', 'ready_for_dispatch', 'handed_over', 'cancelled', 'refunded',
] as const

// Strict state-machine guard — prevents invalid jumps.
// The workflow ends at handover: handed_over is terminal, no refund stage.
const VALID_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['handed_over', 'cancelled'],
  handed_over: [],
  cancelled: [],
  refunded: [],
}

const patchSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
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

    // ── Server-side state-machine enforcement ──────────────────
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()
    const { data: current } = await adminClient.from('orders').select('status').eq('id', id).single()
    if (!current) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const allowed = VALID_TRANSITIONS[current.status as string] ?? []
    // Allow no-op (same status) for idempotency, else enforce transition
    if (current.status !== status && !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status transition: ${current.status} → ${status}. Allowed: ${allowed.join(', ') || 'none'}` },
        { status: 422 }
      )
    }

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
