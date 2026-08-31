import { createAdminClient } from '@/lib/supabase/server'
import type { CustomDesignRequest } from '@/types'
import type { CustomDesignFormValues } from '@/lib/validations'

export async function submitCustomDesignRequest(
  values: CustomDesignFormValues & { referenceImages?: string[] }
): Promise<CustomDesignRequest> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('custom_design_requests')
    .insert({
      name: values.name,
      contact: values.contact,
      email: values.email || null,
      description: values.description,
      budget: values.budget || null,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      reference_images: values.referenceImages || [],
      status: 'NEW',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CustomDesignRequest
}

export async function getCustomDesignRequests(): Promise<CustomDesignRequest[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('custom_design_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as CustomDesignRequest[]
}

export async function updateCustomDesignRequest(
  id: string,
  updates: { status?: string; admin_notes?: string; quoted_price?: number }
): Promise<CustomDesignRequest> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('custom_design_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CustomDesignRequest
}

export async function deleteCustomDesignRequest(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('custom_design_requests')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
