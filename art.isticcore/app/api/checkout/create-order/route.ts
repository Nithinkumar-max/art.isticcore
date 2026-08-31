import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createOrder } from '@/lib/services/orders'

const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  
  quantity: z.number().int().min(1).max(10),
  customNote: z.string().max(500).nullish(),
})

const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address id'),
  items: z.array(orderItemSchema).min(1, 'Cart is empty').max(30),
  paymentMethod: z.literal('razorpay'),
  customerNote: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const parsed = createOrderSchema.safeParse(await request.json())
    if (!parsed.success) {
      const summary = parsed.error.issues
        .map((i) => `${i.path.join('.') || 'payload'}: ${i.message}`)
        .join('; ')
      return NextResponse.json(
        { error: `Invalid order payload — ${summary}` },
        { status: 400 }
      )
    }

    const result = await createOrder({
      userId: user?.id ?? null,
      ...parsed.data,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('API /api/checkout/create-order error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
