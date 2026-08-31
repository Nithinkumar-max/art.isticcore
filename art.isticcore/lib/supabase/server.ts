import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill in your Supabase credentials.`
    )
  }
  return value
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - cookies set via proxy
          }
        },
      },
    }
  )
}

/**
 * Admin client — plain supabase-js with the service role key.
 *
 * IMPORTANT: this intentionally does NOT use @supabase/ssr. The SSR client
 * forwards the signed-in user's cookie JWT as the Authorization header,
 * which makes queries run as role `authenticated` even when the service
 * key is set as apikey. A plain client always authorizes as `service_role`
 * (bypasses RLS) — required for trusted server-side writes like orders,
 * payments, and role promotion.
 */
let adminClient: ReturnType<typeof createSupabaseJsClient<Database>> | null = null

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations.')
  }

  if (!adminClient) {
    adminClient = createSupabaseJsClient<Database>(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      serviceKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )
  }
  return adminClient
}
