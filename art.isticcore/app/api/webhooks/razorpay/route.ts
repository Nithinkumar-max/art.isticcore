import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { createAdminClient } from '@/lib/supabase/server'
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

    let event: Record<string, unknown>
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ status: 'ok' })
    }

    const supabase = createAdminClient()

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = (event.payload as Record<string, unknown>)?.payment as Record<string, unknown> | undefined
      const entity = paymentEntity?.entity as Record<string, unknown> | undefined
      const razorpayOrderId = entity?.order_id as string | undefined
      const razorpayPaymentId = entity?.id as string | undefined

      if (razorpayOrderId) {
        const { data: payment } = await supabase
          .from('payments')
          .select('order_id, status')
          .eq('gateway_order_id', razorpayOrderId)
          .single()

        if (payment) {
          if (payment.status === 'paid') {
            return NextResponse.json({ status: 'ok' })
          }

          await supabase
            .from('orders')
            .update({
              status: 'confirmed',
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.order_id)
            .in('status', ['confirmed'])

          await supabase
            .from('payments')
            .update({
              gateway_payment_id: razorpayPaymentId,
              status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', payment.order_id)

          const fullOrder = await getOrderById(payment.order_id)
          if (fullOrder?.address) {
            const { data: orderUser } = await supabase
              .from('orders')
              .select('user_id')
              .eq('id', payment.order_id)
              .single()

            let email = ''
            if (orderUser?.user_id) {
              const { data: userData } = await supabase.auth.admin.getUserById(orderUser.user_id)
              email = userData?.user?.email ?? ''
            }
            if (!email && fullOrder.address.phone?.includes('@')) {
              email = fullOrder.address.phone
            }

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
      const paymentEntity = (event.payload as Record<string, unknown>)?.payment as Record<string, unknown> | undefined
      const entity = paymentEntity?.entity as Record<string, unknown> | undefined
      const razorpayOrderId = entity?.order_id as string | undefined

      if (razorpayOrderId) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('gateway_order_id', razorpayOrderId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: unknown) {
    console.error('Razorpay webhook processing error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}
