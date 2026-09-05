import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [ordersAll, ordersToday, ordersPendingCOD, ordersShipped, itemsProcessing, recentOrders] = await Promise.all([
    supabase.from('orders').select('id, total, status, created_at'),
    supabase.from('orders').select('id').gte('created_at', todayStart),
    supabase.from('orders').select('id, total').eq('status', 'confirmed').eq('payment_method', 'cod'),
    supabase.from('orders').select('id').eq('status', 'handed_over').gte('created_at', sevenDaysAgo),
    supabase.from('order_items').select('id, quantity').in('order_id',
      (await supabase.from('orders').select('id').in('status', ['confirmed', 'preparing'])).data?.map(o => o.id) ?? []
    ),
    supabase.from('orders').select('id, order_number, status, total, payment_method, created_at, address:addresses(full_name)').order('created_at', { ascending: false }).limit(10),
  ])

  const allOrders = ordersAll.data ?? []
  const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const last30DaysRevenue = allOrders
    .filter(o => new Date(o.created_at) >= new Date(thirtyDaysAgo))
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const last7DaysRevenue = allOrders
    .filter(o => new Date(o.created_at) >= new Date(sevenDaysAgo))
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  const pendingCODTotal = (ordersPendingCOD.data ?? []).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const itemsProcessingCount = (itemsProcessing.data ?? []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)

  // Revenue by month (last 7 months)
  const monthlyRevenue: { month: string; value: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const label = d.toLocaleString('en-IN', { month: 'short' })
    const rev = allOrders
      .filter(o => o.created_at >= monthStart && o.created_at < monthEnd)
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    monthlyRevenue.push({ month: label, value: rev })
  }

  // Order distribution by status
  const statusCounts: Record<string, number> = {}
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  }

  return NextResponse.json({
    totalRevenue,
    last30DaysRevenue,
    last7DaysRevenue,
    totalOrders: allOrders.length,
    ordersToday: (ordersToday.data ?? []).length,
    pendingCODTotal,
    shippedThisWeek: (ordersShipped.data ?? []).length,
    itemsProcessingCount,
    monthlyRevenue,
    statusCounts,
    recentOrders: (recentOrders.data ?? []).map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      total: o.total,
      payment_method: o.payment_method,
      created_at: o.created_at,
      customer_name: (o.address as unknown as { full_name?: string })?.full_name ?? 'Guest',
    })),
  })
}
