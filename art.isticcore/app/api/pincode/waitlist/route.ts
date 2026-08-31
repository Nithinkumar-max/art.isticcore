import { NextRequest, NextResponse } from 'next/server'
import { addPincodeToWaitlist } from '@/lib/services/pincodes'
import { PincodeWaitlistSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = PincodeWaitlistSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }

    const { pincode, email, phone } = parsed.data
    const data = await addPincodeToWaitlist({
      pincode,
      email: email || undefined,
      phone: phone || undefined,
      city: body.city,
      state: body.state,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('API /api/pincode/waitlist error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
