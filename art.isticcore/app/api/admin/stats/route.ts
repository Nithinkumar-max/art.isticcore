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

  const [ordersAll, ordersToday, ordersShipped, itemsProcessing, recentOrders, topProductOrders] = await Promise.all([
    supabase.from('orders').select('id, total, status, created_at'),
    supabase.from('orders').select('id').gte('created_at', todayStart),
    supabase.from('orders').select('id').eq('status', 'handed_over').gte('created_at', sevenDaysAgo),
    supabase.from('order_items').select('id, quantity').in('order_id',
      (await supabase.from('orders').select('id').in('status', ['confirmed', 'preparing'])).data?.map(o => o.id) ?? []
    ),
    supabase.from('orders').select('id, order_number, status, total, created_at, address:addresses(full_name)').order('created_at', { ascending: false }).limit(10),
    supabase.from('orders').select('items:order_items(name, quantity, total)').gte('created_at', thirtyDaysAgo).limit(500),
  ])

  const allOrders = ordersAll.data ?? []
  const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const last30DaysRevenue = allOrders
    .filter(o => new Date(o.created_at) >= new Date(thirtyDaysAgo))
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const last7DaysRevenue = allOrders
    .filter(o => new Date(o.created_at) >= new Date(sevenDaysAgo))
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)

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

  // Revenue + order volume per day (last 14 days)
  const dailyRevenue: { date: string; value: number }[] = []
  const dailyOrders: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()
    const label = d.toLocaleString('en-IN', { day: 'numeric', month: 'short' })
    const rev = allOrders
      .filter(o => o.created_at >= dayStart && o.created_at < dayEnd)
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    const count = allOrders.filter(o => o.created_at >= dayStart && o.created_at < dayEnd).length
    dailyRevenue.push({ date: label, value: rev })
    dailyOrders.push({ date: label, count })
  }

  // Best sellers over the last 30 days
  const productMap = new Map<string, { quantity: number; revenue: number }>()
  for (const order of topProductOrders.data ?? []) {
    for (const item of (order.items as unknown as { name: string; quantity: number; total: number }[]) ?? []) {
      const key = item.name || 'Custom request'
      const entry = productMap.get(key) ?? { quantity: 0, revenue: 0 }
      entry.quantity += Number(item.quantity) || 0
      entry.revenue += Number(item.total) || 0
      productMap.set(key, entry)
    }
  }
  const topProducts = [...productMap.entries()]
    .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

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
    avgOrderValue: allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0,
    shippedThisWeek: (ordersShipped.data ?? []).length,
    itemsProcessingCount,
    monthlyRevenue,
    dailyRevenue,
    dailyOrders,
    statusCounts,
    topProducts,
    recentOrders: (recentOrders.data ?? []).map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      total: o.total,
      created_at: o.created_at,
      customer_name: (o.address as unknown as { full_name?: string })?.full_name ?? 'Guest',
    })),
  })
}