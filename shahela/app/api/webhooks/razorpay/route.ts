import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { createClient } from '@/lib/supabase/server'
import { getOrderById } from '@/lib/services/orders'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 })
    }

    const isValid = verifyWebhookSignature({
      body: rawBody,
      signature,
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const supabase = await createClient()

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity
      const razorpayOrderId = paymentEntity?.order_id
      const razorpayPaymentId = paymentEntity?.id

      if (razorpayOrderId) {
        // Find payment record
        const { data: payment } = await supabase
          .from('payments')
          .select('order_id')
          .eq('gateway_order_id', razorpayOrderId)
          .single()

        if (payment) {
          await supabase
            .from('orders')
            .update({
              status: 'CONFIRMED',
              payment_status: 'PAID',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.order_id)

          await supabase
            .from('payments')
            .update({
              gateway_payment_id: razorpayPaymentId,
              status: 'PAID',
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', payment.order_id)

          const fullOrder = await getOrderById(payment.order_id)
          if (fullOrder && fullOrder.address) {
            const email = fullOrder.address.phone.includes('@') ? fullOrder.address.phone : ''
            if (email) {
              await sendOrderConfirmationEmail({
                order: fullOrder,
                customerEmail: email,
                customerName: fullOrder.address.full_name,
              })
            }
          }
        }
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity
      const razorpayOrderId = paymentEntity?.order_id

      if (razorpayOrderId) {
        await supabase
          .from('payments')
          .update({
            status: 'FAILED',
            updated_at: new Date().toISOString(),
          })
          .eq('gateway_order_id', razorpayOrderId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: unknown) {
    console.error('Razorpay webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}
