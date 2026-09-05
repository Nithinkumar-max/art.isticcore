import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const ordersPending = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['confirmed'])

  return NextResponse.json({
    orders: ordersPending.count ?? 0,
    customRequests: 0,
  })
}
