import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { getOrderById } from '@/lib/services/orders'
import { clearUserCart } from '@/lib/services/cart'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing payment verification parameters' },
        { status: 400 }
      )
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const supabase = await createClient()

    // SECURITY: resolve the order from OUR payments table via the verified
    // gateway order id. The client never gets to choose which order a valid
    // signature applies to (cross-order payment attack).
    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .select('order_id, status')
      .eq('gateway_order_id', razorpayOrderId)
      .single()

    if (paymentErr || !payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // Idempotency: already-processed payments succeed without side effects.
    if (payment.status === 'paid') {
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    // 1. Update Order status — hard-fail on error (previously logged + ignored,
    //    returning success while the order stayed unpaid).
    const { createAdminClient } = await import('@/lib/supabase/server')
    const admin = createAdminClient()
    // Order is created with status 'confirmed'. Allow verification for any
    // pre-payment status in the current enum (confirmed).
    let { data: updatedOrder, error: orderErr } = await admin
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.order_id)
      .in('status', ['confirmed'])
      .select()
      .single()

    if (orderErr || !updatedOrder) {
      console.error('Failed to update order payment status:', orderErr)
      return NextResponse.json(
        { error: 'Order is not in a payable state' },
        { status: 409 }
      )
    }

    // 2. Update Payment record
    const { error: payUpdateErr } = await admin
      .from('payments')
      .update({
        gateway_payment_id: razorpayPaymentId,
        gateway_signature: razorpaySignature,
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', payment.order_id)

    if (payUpdateErr) {
      // Webhook will reconcile, but surface the failure.
      console.error('Failed to mark payment PAID:', payUpdateErr)
    }

    // 3. Clear cart if user logged in
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await clearUserCart(user.id)
    }

    // 4. Send confirmation email
    const fullOrder = await getOrderById(payment.order_id)
    if (fullOrder && fullOrder.address) {
      const email = user?.email ?? ''
      if (email) {
        await sendOrderConfirmationEmail({
          order: fullOrder,
          customerEmail: email,
          customerName: fullOrder.address.full_name,
        })
      }
    }

    return NextResponse.json({ success: true, order: fullOrder ?? updatedOrder })
  } catch (error: unknown) {
    console.error('API /api/checkout/verify-payment error:', error)
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
  }
}
