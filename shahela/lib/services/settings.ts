import { createClient } from '@/lib/supabase/server'
import { cache, TTL } from '@/lib/redis'
import type { SiteSetting } from '@/types'

export async function getSiteSettings(): Promise<Record<string, string>> {
  const cached = await cache.get<Record<string, string>>(cache.keys.settings())
  if (cached) return cached

  const supabase = await createClient()
  const { data, error } = await supabase.from('site_settings').select('*')

  if (error || !data) {
    console.error('Failed to fetch site settings:', error)
    return {}
  }

  const map: Record<string, string> = {}
  data.forEach((item: SiteSetting) => {
    map[item.key] = item.value
  })

  await cache.set(cache.keys.settings(), map, TTL.SETTINGS)
  return map
}

export async function getSiteSetting(key: string, defaultValue: string = ''): Promise<string> {
  const settings = await getSiteSettings()
  return settings[key] ?? defaultValue
}
