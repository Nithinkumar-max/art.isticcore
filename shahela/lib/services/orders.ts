import { createClient } from '@/lib/supabase/server'
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
  ProductVariant,
  Product,
} from '@/types'

export interface CreateOrderItemInput {
  productId: string
  variantId?: string | null
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

  // 1. Fetch products & variants to calculate verified subtotal and lead time
  const productIds = items.map((i) => i.productId)
  const { data: productsData, error: prodErr } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .in('id', productIds)

  if (prodErr || !productsData) {
    throw new Error('Failed to verify products')
  }

  const productsMap = new Map<string, Product & { product_variants: ProductVariant[] }>()
  productsData.forEach((p) => productsMap.set(p.id, p))

  let subtotal = 0
  let maxLeadTime = 12
  const orderItemsPayload: Array<{
    product_id: string
    variant_id: string | null
    name: string
    quantity: number
    price: number
    discount: number
    total: number
    custom_note: string | null
  }> = []

  for (const item of items) {
    const product = productsMap.get(item.productId)
    if (!product || !product.is_active || !product.is_orderable) {
      throw new Error(`Product ${item.productId} is unavailable`)
    }

    let unitPrice = product.discount_price ?? product.base_price
    let itemName = product.name
    let itemLeadTime = product.lead_time_days ?? 12

    if (item.variantId) {
      const variant = product.product_variants.find((v: ProductVariant) => v.id === item.variantId)
      if (variant && variant.is_active) {
        unitPrice = variant.discount_price ?? variant.price
        itemName = `${product.name} - ${variant.name}`
        if (variant.lead_time_days) itemLeadTime = variant.lead_time_days
      }
    }

    if (itemLeadTime > maxLeadTime) {
      maxLeadTime = itemLeadTime
    }

    const itemTotal = unitPrice * item.quantity
    subtotal += itemTotal

    orderItemsPayload.push({
      product_id: item.productId,
      variant_id: item.variantId || null,
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
  const codMaxLimit = parseFloat(settings.cod_max_limit || '1000')

  if (paymentMethod === 'COD' && subtotal > codMaxLimit) {
    throw new Error(`Cash on Delivery is only available for orders up to ₹${codMaxLimit}`)
  }

  const shippingFee = subtotal >= freeShippingThreshold ? 0 : flatShippingFee
  const discount = 0 // Apply coupons here when present
  const grandTotal = subtotal - discount + shippingFee
  const estimatedCompletionDate = addBusinessDays(new Date(), maxLeadTime).toISOString()

  // 3. Create Order record
  const orderNumber = generateOrderNumber()
  const initialStatus: OrderStatus = paymentMethod === 'COD' ? 'CONFIRMED' : 'PLACED'
  const initialPaymentStatus: PaymentStatus = paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING'

  const { data: orderData, error: orderErr } = await supabase
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

  const { error: itemsErr } = await supabase.from('order_items').insert(itemsWithOrderId)
  if (itemsErr) {
    console.error('Order items insert error:', itemsErr)
  }

  // 5. Handle Payment Gateway setup if ONLINE/RAZORPAY
  let razorpayOrderId: string | undefined
  if (paymentMethod === 'ONLINE' || paymentMethod === 'RAZORPAY') {
    if (!razorpay) {
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

      // Record in payments table
      await supabase.from('payments').insert({
        order_id: createdOrder.id,
        gateway: 'RAZORPAY',
        gateway_order_id: razorpayOrderId,
        amount: grandTotal,
        currency: 'INR',
        status: 'PENDING',
      })
    } catch (err: unknown) {
      console.error('Razorpay order creation error:', err)
      throw new Error('Failed to initiate online payment session')
    }
  } else if (paymentMethod === 'COD') {
    // Record in payments table
    await supabase.from('payments').insert({
      order_id: createdOrder.id,
      gateway: 'COD',
      amount: grandTotal,
      currency: 'INR',
      status: 'COD_PENDING',
    })
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
      items:order_items(*),
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
      items:order_items(*),
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
      items:order_items(*),
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
  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (trackingNumber !== undefined) updatePayload.tracking_number = trackingNumber
  if (trackingUrl !== undefined) updatePayload.tracking_url = trackingUrl
  if (courierName !== undefined) updatePayload.courier_name = courierName
  if (adminNote !== undefined) updatePayload.admin_note = adminNote

  if (status === 'SHIPPED') {
    updatePayload.shipped_date = new Date().toISOString()
  } else if (status === 'DELIVERED') {
    updatePayload.delivered_date = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select(
      `
      *,
      items:order_items(*),
      address:addresses(*),
      payment:payments(*)
    `
    )
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to update order status')

  const updatedOrder = data as unknown as OrderWithItems

  // Send shipping notification email if shipped
  if (status === 'SHIPPED' && updatedOrder.address) {
    const customerEmail = updatedOrder.address.phone || '' // or lookup user email
    if (customerEmail.includes('@')) {
      await sendOrderShippingEmail({
        order: updatedOrder,
        customerEmail,
        customerName: updatedOrder.address.full_name,
      })
    }
  }

  return updatedOrder
}
