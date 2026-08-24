import { createClient } from '@/lib/supabase/server'
import type { Review } from '@/types'
import type { ReviewFormValues } from '@/lib/validations'

export async function getProductReviews(productId: string): Promise<Review[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      *,
      user:users(id, name)
    `
    )
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as Review[]
}

export async function getProductRatingSummary(productId: string) {
  const reviews = await getProductReviews(productId)
  const total = reviews.length
  if (total === 0) return { average: 0, count: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }

  let sum = 0
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach((r) => {
    sum += r.rating
    breakdown[r.rating] = (breakdown[r.rating] || 0) + 1
  })

  return {
    average: Number((sum / total).toFixed(1)),
    count: total,
    breakdown,
  }
}

export async function submitReview({
  productId,
  userId,
  values,
}: {
  productId: string
  userId?: string | null
  values: ReviewFormValues
}) {
  const supabase = await createClient()

  // Check if user is a verified buyer of this product
  let isVerifiedPurchase = false
  if (userId) {
    const { data: orderItem } = await supabase
      .from('order_items')
      .select('id, orders!inner(user_id, status)')
      .eq('product_id', productId)
      .eq('orders.user_id', userId)
      .eq('orders.status', 'DELIVERED')
      .limit(1)
      .single()

    if (orderItem) isVerifiedPurchase = true
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id: productId,
      user_id: userId || null,
      rating: values.rating,
      title: values.title || null,
      comment: values.comment || null,
      guest_name: values.guest_name || null,
      guest_phone: values.guest_phone || null,
      is_approved: true, // auto-approve standard or change to false if moderation preferred
      is_verified_purchase: isVerifiedPurchase,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
