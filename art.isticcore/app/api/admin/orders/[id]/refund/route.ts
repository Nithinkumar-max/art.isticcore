import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth'
import { markOrderPaymentRefunded } from '@/lib/services/orders'

const refundSchema = z.object({
  refunded: z.boolean(),
})

/**
 * POST /api/admin/orders/[id]/refund — mark a cancelled order's prepaid payment
 * as refunded (or revert it) for refund tracking. No money moves here; refunds
 * are processed in the Razorpay dashboard. This only reconciles the ledger.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const parsed = refundSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: z.treeifyError(parsed.error) },
        { status: 400 }
      )
    }

    const updated = await markOrderPaymentRefunded(id, parsed.data.refunded)
    return NextResponse.json({ success: true, order: updated })
  } catch (error: unknown) {
    console.error('API /api/admin/orders/[id]/refund POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update refund status'
    const status = message.includes('not found') || message.includes('Only cancelled') ? 422 : 500
    return NextResponse.json({ error: message }, { status })
  }
}