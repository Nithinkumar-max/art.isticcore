import { createClient, createAdminClient } from '@/lib/supabase/server'
import { razorpay } from '@/lib/razorpay'
import { getSiteSettings } from './settings'
import { addBusinessDays } from '@/lib/utils'
import { sendOrderConfirmationEmail, sendOrderShippingEmail } from '@/lib/email'
import type {
  Order,
  OrderWithItems,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
} from '@/types'

export interface CreateOrderItemInput {
  productId: string
  
  quantity: number
  customNote?: string | null
}

export interface CreateOrderParams {
  userId?: string | null
  addressId: string
  items: CreateOrderItemInput[]
  paymentMethod: PaymentMethod
  customerNote?: string
}

export interface CreateOrderResult {
  order: Order
  razorpayOrderId?: string
  razorpayKeyId?: string
}

/**
 * Generate a unique human-friendly order number
 */
function generateOrderNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const random = Math.floor(100000 + Math.random() * 900000)
  return `AC${year}-${random}`
}

export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { userId, addressId, items, paymentMethod, customerNote } = params
  const supabase = await createClient()

  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one item')
  }
  if (!userId) {
    throw new Error('Please sign in to place an order')
  }

  // Server-side ownership check: the address must belong to the signed-in user.
  const { data: addressRow } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!addressRow) {
    throw new Error('Delivery address not found — please pick or save an address first')
  }

  // Order writes go through the service-role client: the user was verified
  // from the JWT above and user_id is stamped server-side, so RLS policies
  // are not required for the insert (customers keep read-scoped access).
  const admin = await createAdminClient()

  // 1. Fetch products to calculate verified subtotal and lead time
  const productIds = items.map((i) => i.productId)
  const { data: productsData, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds)

  if (prodErr || !productsData) {
    throw new Error('Failed to verify products')
  }

  type ProductRow = Product & { is_orderable?: boolean }
  const productsMap = new Map<string, ProductRow>()
  productsData.forEach((p) => productsMap.set(p.id, p))

  let subtotal = 0
  let maxLeadTime = 12
  const orderItemsPayload: Array<{
    product_id: string
    
    name: string
    quantity: number
    price: number
    discount: number
    total: number
    custom_note: string | null
  }> = []

  for (const item of items) {
    const product = productsMap.get(item.productId)
    const canCommission = product?.is_available ?? product?.is_orderable ?? true
    if (!product || !product.is_active || !canCommission) {
      throw new Error(`Product ${item.productId} is unavailable`)
    }

    let unitPrice = product.discount_price ?? product.base_price
    let itemName = product.name
    let itemLeadTime = product.lead_time_days ?? 12

    // Variants removed — use product-level pricing only

    if (itemLeadTime > maxLeadTime) {
      maxLeadTime = itemLeadTime
    }

    const itemTotal = unitPrice * item.quantity
    subtotal += itemTotal

    orderItemsPayload.push({
      product_id: item.productId,
      
      name: itemName,
      quantity: item.quantity,
      price: unitPrice,
      discount: 0,
      total: itemTotal,
      custom_note: item.customNote || null,
    })
  }

  // 2. Fetch shipping settings
  const settings = await getSiteSettings()
  const freeShippingThreshold = parseFloat(settings.free_shipping_threshold || '2000')
  const flatShippingFee = parseFloat(settings.flat_shipping_fee || '99')

  const shippingFee = subtotal >= freeShippingThreshold ? 0 : flatShippingFee
  const discount = 0 // Apply coupons here when present
  const grandTotal = subtotal - discount + shippingFee
  const estimatedCompletionDate = addBusinessDays(new Date(), maxLeadTime).toISOString()

  // 3. Create Order record
  const orderNumber = generateOrderNumber()
  const initialStatus: OrderStatus = 'confirmed'
  const initialPaymentStatus: PaymentStatus = 'pending'

  const { data: orderData, error: orderErr } = await admin
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: userId || null,
      address_id: addressId,
      status: initialStatus,
      payment_method: paymentMethod,
      payment_status: initialPaymentStatus,
      subtotal,
      discount,
      shipping_fee: shippingFee,
      total: grandTotal,
      estimated_completion_date: estimatedCompletionDate,
      customer_note: customerNote || null,
    })
    .select()
    .single()

  if (orderErr || !orderData) {
    console.error('Order creation error:', orderErr)
    throw new Error('Failed to create order')
  }

  const createdOrder = orderData as Order

  // 4. Create Order Items
  const itemsWithOrderId = orderItemsPayload.map((item) => ({
    ...item,
    order_id: createdOrder.id,
  }))

  const { error: itemsErr } = await admin.from('order_items').insert(itemsWithOrderId)
  if (itemsErr) {
    console.error('Order items insert error:', itemsErr)
    await admin.from('orders').delete().eq('id', createdOrder.id)
    throw new Error('Failed to save order items')
  }

  let razorpayOrderId: string | undefined
  if (paymentMethod === 'razorpay') {
    if (!razorpay) {
      await admin.from('order_items').delete().eq('order_id', createdOrder.id)
      await admin.from('orders').delete().eq('id', createdOrder.id)
      throw new Error('Payment gateway not configured')
    }

    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(grandTotal * 100), // in paise
        currency: 'INR',
        receipt: createdOrder.order_number,
        notes: {
          order_id: createdOrder.id,
          order_number: createdOrder.order_number,
        },
      })

      razorpayOrderId = razorpayOrder.id

      // Record in payments table (service-role write per schema design)
      await admin.from('payments').insert({
        order_id: createdOrder.id,
        gateway: 'razorpay',
        gateway_order_id: razorpayOrderId,
        amount: grandTotal,
        currency: 'INR',
        status: 'pending',
      })
    } catch (err: unknown) {
      console.error('Razorpay order creation error:', err)
      throw new Error('Failed to initiate online payment session')
    }
  }

  return {
    order: createdOrder,
    razorpayOrderId,
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
  }
}

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      items:order_items(
        *,
        product:products(
          id, name,
          images:product_images(url, alt_text, display_order, is_primary)
        )
      ),
      address:addresses(*),
      payment:payments(*)
    `
    )
    .eq('id', orderId)
    .single()

  if (error || !data) return null
  return data as unknown as OrderWithItems
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      items:order_items(
        *,
        product:products(
          id, name,
          images:product_images(url, alt_text, display_order, is_primary)
        )
      ),
      address:addresses(*),
      payment:payments(*)
    `
    )
    .eq('order_number', orderNumber)
    .single()

  if (error || !data) return null
  return data as unknown as OrderWithItems
}

export async function getUserOrders(userId: string): Promise<OrderWithItems[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      items:order_items(
        *,
        product:products(
          id, name,
          images:product_images(url, alt_text, display_order, is_primary)
        )
      ),
      address:addresses(*),
      payment:payments(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as OrderWithItems[]
}

export async function updateOrderStatus({
  orderId,
  status,
  trackingNumber,
  trackingUrl,
  courierName,
  adminNote,
}: {
  orderId: string
  status: OrderStatus
  trackingNumber?: string
  trackingUrl?: string
  courierName?: string
  adminNote?: string
}): Promise<OrderWithItems> {
  // Status changes are admin-only — use service-role to bypass RLS
  const supabase = await createAdminClient()

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (trackingNumber !== undefined) updatePayload.tracking_number = trackingNumber
  if (trackingUrl !== undefined) updatePayload.tracking_url = trackingUrl
  if (courierName !== undefined) updatePayload.courier_name = courierName
  if (adminNote !== undefined) updatePayload.admin_note = adminNote

  // Handle status timestamps: hand-over is when the parcel leaves us
  if (status === 'handed_over') {
    updatePayload.shipped_date = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select(
      `
      *,
      items:order_items(
        *,
        product:products(
          id, name,
          images:product_images(url, alt_text, display_order, is_primary)
        )
      ),
      address:addresses(*),
      payment:payments(*)
    `,
    )
    .single()

  if (error || !data) throw new Error((error as { message?: string })?.message || 'Failed to update order status')

  const updatedOrder = data as unknown as OrderWithItems

  // Send shipping notification email once handed to the delivery agent
  if (status === 'handed_over' && updatedOrder.address) {
    let customerEmail = ''
    if (updatedOrder.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(updatedOrder.user_id)
      customerEmail = userData?.user?.email ?? ''
    }
    if (!customerEmail && updatedOrder.address.phone?.includes('@')) {
      customerEmail = updatedOrder.address.phone
    }
    if (customerEmail) {
      await sendOrderShippingEmail({
        order: updatedOrder,
        customerEmail,
        customerName: updatedOrder.address.full_name,
      })
    }
  }

  return updatedOrder
}
