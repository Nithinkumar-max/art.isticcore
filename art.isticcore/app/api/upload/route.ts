import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'

const ALLOWED_FOLDERS = ['products', 'collections', 'banners', 'custom-requests'] as const
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export async function POST(request: NextRequest) {
  try {
    // Admin-only: role verified against public.users.
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const rawFolder = formData.get('folder')
    const rawSlot = formData.get('slot')
    const altText = typeof formData.get('alt') === 'string' ? String(formData.get('alt')) : null
    const folder = typeof rawFolder === 'string' && (ALLOWED_FOLDERS as readonly string[]).includes(rawFolder)
      ? rawFolder
      : 'products'
    const slot = typeof rawSlot === 'string' && rawSlot.trim() ? rawSlot.trim().slice(0, 100) : null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { error: 'Only image/webp, image/jpeg, image/png are allowed' },
        { status: 415 }
      )
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 413 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
    const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadErr) {
      console.error('Storage upload failed:', uploadErr)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // Register in the media library. If a slot is given, it atomically replaces
    // the previous asset (unique slot) so the storefront picks it up.
    const insertRow = {
      slot,
      bucket: 'product-images',
      storage_path: path,
      url: publicUrl,
      alt_text: altText,
      created_by: user?.id ?? null,
    }

    let mediaId: string | null = null
    if (slot) {
      const { data: mediaRow, error: mediaErr } = await supabase
        .from('media')
        .upsert(insertRow, { onConflict: 'slot' })
        .select('id')
        .single()
      if (mediaErr) console.error('Media row upsert failed:', mediaErr)
      else mediaId = mediaRow?.id ?? null
    } else {
      const { data: mediaRow, error: mediaErr } = await supabase
        .from('media')
        .insert(insertRow)
        .select('id')
        .single()
      if (mediaErr) console.error('Media row insert failed:', mediaErr)
      else mediaId = mediaRow?.id ?? null
    }

    return NextResponse.json({ id: mediaId, url: publicUrl, path, bucket: 'product-images' }, { status: 201 })
  } catch (error: unknown) {
    console.error('API /api/upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
