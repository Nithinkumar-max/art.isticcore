import { createClient } from '@/lib/supabase/server'

export interface MediaAsset {
  id: string
  slot: string | null
  url: string
  alt_text: string | null
}

/** Fetch a single active media slot (hero images, banners). */
export async function getMediaBySlot(slot: string): Promise<MediaAsset | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('media')
    .select('id, slot, url, alt_text')
    .eq('slot', slot)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return data ?? null
}
