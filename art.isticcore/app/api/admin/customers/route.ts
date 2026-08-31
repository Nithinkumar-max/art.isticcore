import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  // Fetch all users with their order counts and total spent.
  let profilesQuery = supabase
    .from('users')
    .select('id, name, email, phone, created_at')

  if (search) {
    profilesQuery = profilesQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data: profiles, error: profilesErr } = await profilesQuery.order('created_at', { ascending: false })
  if (profilesErr) return NextResponse.json({ error: profilesErr.message }, { status: 500 })

  // For each profile, count orders and sum totals
  const results = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('user_id', p.id)

      const orderCount = (orders ?? []).length
      const totalSpent = (orders ?? []).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      const lastOrder = (orders ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      return {
        ...p,
        full_name: p.name,
        city: null,
        state: null,
        pincode: null,
        orders: orderCount,
        spent: totalSpent,
        lastOrder: lastOrder?.created_at ?? null,
        active: lastOrder ? new Date(lastOrder.created_at).getTime() > Date.now() - 30 * 86400000 : false,
      }
    }),
  )

  return NextResponse.json(results)
}
