import { createClient } from '@/lib/supabase/server'
import { cache, TTL } from '@/lib/redis'
import type { ServiceablePincode } from '@/types'

export interface PincodeCheckResult {
  isServiceable: boolean
  pincode: string
  city?: string
  state?: string
  codAvailable: boolean
  codMaxAmount: number
  estimatedDays: number
  shippingFee: number
}

export async function checkPincodeServiceability(
  pincode: string
): Promise<PincodeCheckResult> {
  const cleanPin = pincode.trim()
  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      isServiceable: false,
      pincode: cleanPin,
      codAvailable: false,
      codMaxAmount: 0,
      estimatedDays: 15,
      shippingFee: 0,
    }
  }

  const cached = await cache.get<PincodeCheckResult>(cache.keys.pincode(cleanPin))
  if (cached) return cached

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('serviceable_pincodes')
    .select('*')
    .eq('pincode', cleanPin)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    const result: PincodeCheckResult = {
      isServiceable: false,
      pincode: cleanPin,
      codAvailable: false,
      codMaxAmount: 0,
      estimatedDays: 15,
      shippingFee: 0,
    }
    return result
  }

  const row = data as ServiceablePincode
  const result: PincodeCheckResult = {
    isServiceable: true,
    pincode: cleanPin,
    city: row.city,
    state: row.state,
    codAvailable: row.cod_available,
    codMaxAmount: row.cod_max_amount,
    estimatedDays: row.estimated_days,
    shippingFee: row.shipping_fee,
  }

  await cache.set(cache.keys.pincode(cleanPin), result, TTL.PINCODE)
  return result
}

export async function addPincodeToWaitlist({
  pincode,
  email,
  phone,
  city,
  state,
}: {
  pincode: string
  email?: string
  phone?: string
  city?: string
  state?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pincode_waitlist')
    .upsert(
      {
        pincode: pincode.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        city: city || null,
        state: state || null,
      },
      { onConflict: 'pincode,email' }
    )
    .select()
    .single()

  if (error) {
    console.error('Waitlist upsert error:', error)
    throw new Error(error.message)
  }

  return data
}
