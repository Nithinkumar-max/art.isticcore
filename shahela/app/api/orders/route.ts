import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrders } from '@/lib/services/orders'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await getUserOrders(user.id)
    return NextResponse.json(orders)
  } catch (error: unknown) {
    console.error('API /api/orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
