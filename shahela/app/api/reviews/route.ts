import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProductReviews, submitReview, getProductRatingSummary } from '@/lib/services/reviews'
import { ReviewSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const [reviews, summary] = await Promise.all([
      getProductReviews(productId),
      getProductRatingSummary(productId),
    ])

    return NextResponse.json({ reviews, summary })
  } catch (error: unknown) {
    console.error('API /api/reviews GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await request.json()
    const { productId, ...formValues } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const parsed = ReviewSchema.safeParse(formValues)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid review data' }, { status: 400 })
    }

    const review = await submitReview({
      productId,
      userId: user?.id || null,
      values: parsed.data,
    })

    return NextResponse.json({ success: true, review })
  } catch (error: unknown) {
    console.error('API /api/reviews POST error:', error)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
