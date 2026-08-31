import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  fullName: z.string().min(1).max(100),
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone'),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RLS scopes rows to the owner; explicit eq() as defense in depth.
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('GET /api/account/addresses error:', error)
      return NextResponse.json({ error: 'Failed to load addresses' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error: unknown) {
    console.error('API /api/account/addresses GET error:', error)
    return NextResponse.json({ error: 'Failed to load addresses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = addressSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid address' },
        { status: 400 }
      )
    }

    const { label, fullName, phone, line1, line2, city, state, pincode } = parsed.data
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        label,
        full_name: fullName,
        phone,
        line1,
        line2: line2 || null,
        city,
        state,
        pincode,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('POST /api/account/addresses error:', error)
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error('API /api/account/addresses POST error:', error)
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
  }
}
