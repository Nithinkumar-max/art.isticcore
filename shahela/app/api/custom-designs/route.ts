import { NextRequest, NextResponse } from 'next/server'
import { submitCustomDesignRequest } from '@/lib/services/custom-designs'
import { CustomDesignSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
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
