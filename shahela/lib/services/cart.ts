import { createClient } from '@/lib/supabase/server'
import type { CartItemWithProduct } from '@/types'

export async function getOrCreateUserCartId(userId: string): Promise<string> {
  const supabase = await createClient()

  // Try to find existing cart
  const { data: existing } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) return existing.id

  // Create new cart
  const { data: created, error } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single()

  if (error || !created) throw new Error('Failed to initialize user cart')
  return created.id
}

export async function getUserCartItems(userId: string): Promise<CartItemWithProduct[]> {
  const supabase = await createClient()
  const cartId = await getOrCreateUserCartId(userId)

  const { data, error } = await supabase
    .from('cart_items')
    .select(
      `
      *,
      product:products(*, images:product_images(*)),
      variant:product_variants(*)
    `
    )
    .eq('cart_id', cartId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching cart items:', error)
    return []
  }

  return data as unknown as CartItemWithProduct[]
}

export async function syncCartItems(
  userId: string,
  localItems: Array<{
    productId: string
    variantId?: string | null
    quantity: number
    customNote?: string | null
  }>
): Promise<void> {
  const supabase = await createClient()
  const cartId = await getOrCreateUserCartId(userId)

  for (const item of localItems) {
    const payload = {
      cart_id: cartId,
      product_id: item.productId,
      variant_id: item.variantId || null,
      quantity: item.quantity,
      custom_note: item.customNote || null,
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('cart_items')
      .upsert(payload, { onConflict: 'cart_id,product_id,variant_id' })
  }
}

export async function clearUserCart(userId: string): Promise<void> {
  const supabase = await createClient()
  const cartId = await getOrCreateUserCartId(userId)
  await supabase.from('cart_items').delete().eq('cart_id', cartId)
}
