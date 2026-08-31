import { createClient } from '@/lib/supabase/server'
import type { Address } from '@/types'
import type { AddressFormValues } from '@/lib/validations'

export async function getUserAddresses(userId: string): Promise<Address[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching addresses:', error)
    return []
  }

  return (data as Address[]) || []
}

export async function getAddressById(id: string, userId: string): Promise<Address | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as Address
}

export async function createAddress(userId: string, values: AddressFormValues): Promise<Address> {
  const supabase = await createClient()

  if (values.is_default) {
    // Unset current default
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: userId,
      full_name: values.full_name,
      phone: values.phone,
      line1: values.line1,
      line2: values.line2 || null,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      landmark: values.landmark || null,
      is_default: values.is_default ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Address
}

export async function updateAddress(
  id: string,
  userId: string,
  values: Partial<AddressFormValues>
): Promise<Address> {
  const supabase = await createClient()

  if (values.is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
  }

  const { data, error } = await supabase
    .from('addresses')
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Address
}

export async function deleteAddress(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to delete address:', error)
    return false
  }

  return true
}
