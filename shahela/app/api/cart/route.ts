import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserCartItems, syncCartItems, clearUserCart } from '@/lib/services/cart'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ items: [] })
    }

    const items = await getUserCartItems(user.id)
    return NextResponse.json({ items })
  } catch (error: unknown) {
    console.error('API /api/cart GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
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

    const body = await request.json()
    const { items } = body

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 })
    }

    await syncCartItems(user.id, items)
    const updatedItems = await getUserCartItems(user.id)

    return NextResponse.json({ items: updatedItems })
  } catch (error: unknown) {
    console.error('API /api/cart POST error:', error)
    return NextResponse.json({ error: 'Failed to sync cart' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await clearUserCart(user.id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('API /api/cart DELETE error:', error)
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 })
  }
}
