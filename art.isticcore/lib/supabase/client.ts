import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder-anon-key'

  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(url, key)
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(url, key)
  }

  return clientInstance
}
