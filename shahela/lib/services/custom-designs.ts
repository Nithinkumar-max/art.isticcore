import { createClient } from '@/lib/supabase/server'
import type { CustomDesignRequest } from '@/types'
import type { CustomDesignFormValues } from '@/lib/validations'

export async function submitCustomDesignRequest(
  values: CustomDesignFormValues & { referenceImages?: string[] }
): Promise<CustomDesignRequest> {
  const supabase = await createClient()

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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('custom_design_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as CustomDesignRequest[]
}
