import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { submitCustomDesignRequest } from '@/lib/services/custom-designs'
import { CustomDesignSchema } from '@/lib/validations'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 5

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // Multipart submission with reference images (custom-order form).
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const files = formData.getAll('images').filter((entry): entry is File => entry instanceof File)

      if (files.length > MAX_FILES) {
        return NextResponse.json({ error: `Maximum ${MAX_FILES} images allowed` }, { status: 400 })
      }
      for (const file of files) {
        if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
          return NextResponse.json({ error: 'Only JPG, PNG or WEBP images are allowed' }, { status: 415 })
        }
        if (file.size > MAX_FILE_BYTES) {
          return NextResponse.json({ error: 'Each image must be under 5MB' }, { status: 413 })
        }
      }

      const parsed = CustomDesignSchema.safeParse({
        name: formData.get('name'),
        contact: formData.get('contact'),
        email: formData.get('email') || undefined,
        description: formData.get('description'),
        budget: formData.get('budget') || undefined,
        deadline: formData.get('deadline') || undefined,
      })
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid form data' }, { status: 400 })
      }

      const referenceImages: string[] = []
      if (files.length) {
        // Service-role client: anonymous visitors cannot insert into the
        // (RLS-guarded) storage bucket directly.
        const admin = await createAdminClient()
        for (const file of files) {
          const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
          const path = `custom-requests/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
          const buffer = Buffer.from(await file.arrayBuffer())
          const { error: uploadErr } = await admin.storage
            .from('product-images')
            .upload(path, buffer, { contentType: file.type, upsert: false })
          if (uploadErr) {
            console.error('Custom-request image upload failed:', uploadErr)
            continue
          }
          const { data: urlData } = admin.storage.from('product-images').getPublicUrl(path)
          referenceImages.push(urlData.publicUrl)
        }
      }

      const created = await submitCustomDesignRequest({ ...parsed.data, referenceImages })
      return NextResponse.json({ success: true, request: created })
    }

    // Legacy JSON submission without images.
    const body = await request.json()
    const parsed = CustomDesignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid form data' }, { status: 400 })
    }
    const created = await submitCustomDesignRequest({
      ...parsed.data,
      referenceImages: body.referenceImages || [],
    })
    return NextResponse.json({ success: true, request: created })
  } catch (error: unknown) {
    console.error('API /api/custom-designs error:', error)
    return NextResponse.json({ error: 'Failed to submit custom design request' }, { status: 500 })
  }
}
