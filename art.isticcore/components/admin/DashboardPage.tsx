'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Banknote, BarChart3, Box, CircleDollarSign, PackageCheck, ShoppingBag, Sparkles, TrendingUp, Wrench } from 'lucide-react'
import Link from 'next/link'
import { ORDER_STATUS_MAP } from '@/lib/utils'

interface DashboardData {
  totalRevenue: number
  last30DaysRevenue: number
  last7DaysRevenue: number
  totalOrders: number
  ordersToday: number
  pendingCODTotal: number
  shippedThisWeek: number
  itemsProcessingCount: number
  monthlyRevenue: { month: string; value: number }[]
  statusCounts: Record<string, number>
  recentOrders: { id: string; order_number: string; status: string; total: number; payment_method: string; created_at: string; customer_name: string }[]
}

function formatINR(n: number) {
  if (n === 0) return '\u20B90'
  return '\u20B9' + n.toLocaleString('en-IN')
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Could not load dashboard data'); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="bg-admin-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <div className="h-40 animate-pulse rounded-[28px] bg-surface-container-low" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface-container-low" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-admin-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1400px] text-center py-20 text-on-surface-variant">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const maxMonthly = Math.max(...data.monthlyRevenue.map(m => m.value), 1)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  // Build SVG path from monthly data
  const chartWidth = 700
  const chartHeight = 240
  const padding = 10
  const points = data.monthlyRevenue.map((m, i) => ({
    x: padding + (i / Math.max(data.monthlyRevenue.length - 1, 1)) * (chartWidth - padding * 2),
    y: chartHeight - padding - ((m.value / maxMonthly) * (chartHeight - padding * 2)),
  }))
  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
  const fillPath = linePath + ` L ${points[points.length - 1]?.x ?? 0} ${chartHeight} L ${points[0]?.x ?? 0} ${chartHeight} Z`

  // Order distribution data
  const distributionColors: Record<string, string> = {
    confirmed: 'bg-warning',
    preparing: 'bg-secondary-container',
    ready_for_dispatch: 'bg-[#427bd1]',
    handed_over: 'bg-success',
    cancelled: 'bg-outline',
    refunded: 'bg-outline',
  }
  const totalOrders = Object.values(data.statusCounts).reduce((a, b) => a + b, 0) || 1
  const distribution = Object.entries(data.statusCounts)
    .map(([status, count]) => ({
      status,
      label: ORDER_STATUS_MAP[status as keyof typeof ORDER_STATUS_MAP]?.label ?? status,
      percent: Math.round((count / totalOrders) * 100),
      color: distributionColors[status] ?? 'bg-outline',
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4)

  const metrics = [
    { label: 'Total revenue', value: formatINR(data.totalRevenue), delta: `Last 30d: ${formatINR(data.last30DaysRevenue)}`, icon: CircleDollarSign, tone: 'positive' },
    { label: 'Total orders', value: String(data.totalOrders), delta: `${data.ordersToday} today`, icon: ShoppingBag, tone: 'positive' },
    { label: 'In production', value: `${data.itemsProcessingCount} items`, delta: data.itemsProcessingCount > 0 ? 'Active' : 'None', icon: Wrench, tone: data.itemsProcessingCount > 0 ? 'neutral' : 'positive' },
    { label: 'Pending COD', value: formatINR(data.pendingCODTotal), delta: data.pendingCODTotal > 0 ? 'Action needed' : 'Clear', icon: Banknote, tone: data.pendingCODTotal > 0 ? 'warning' : 'positive' },
  ]

  return (
    <div className="bg-admin-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Hero greeting */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-primary-fixed to-primary-fixed-dim p-6 sm:p-8">
          <Sparkles className="absolute -right-8 -top-10 h-48 w-48 text-primary opacity-15" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="label-caps text-on-primary-fixed-variant">{greeting}, Art.isticcore</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold text-on-primary-fixed sm:text-5xl">
                {data.ordersToday > 0 ? `You have ${data.ordersToday} order${data.ordersToday === 1 ? '' : 's'} today.` : 'No orders today yet.'}
              </h2>
              <p className="mt-2 text-sm text-on-primary-fixed-variant sm:text-base">
                {data.shippedThisWeek > 0 ? `${data.shippedThisWeek} delivered this week` : 'No deliveries this week'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-white/30 bg-white/50 p-4 backdrop-blur-sm">
                <p className="text-xs text-on-primary-fixed-variant">Today&apos;s orders</p>
                <p className="mt-2 font-serif text-2xl text-on-primary-fixed">{data.ordersToday}</p>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/50 p-4 backdrop-blur-sm">
                <p className="text-xs text-on-primary-fixed-variant">To ship</p>
                <p className="mt-2 font-serif text-2xl text-on-primary-fixed">{data.itemsProcessingCount}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Metric cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, delta, icon: Icon, tone }) => (
            <article key={label} className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary-container"><Icon className="h-5 w-5" /></span>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone === 'positive' ? 'bg-[#e7f8ef] text-success' : tone === 'warning' ? 'bg-[#fff4df] text-warning' : 'bg-surface-container text-on-surface-variant'}`}>
                  {tone === 'positive' ? <TrendingUp className="h-3.5 w-3.5" /> : null}{delta}
                </span>
              </div>
              <p className="mt-7 text-sm text-on-surface-variant">{label}</p>
              <p className="mt-1 font-serif text-3xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        {/* Charts row */}
        <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          {/* Revenue chart */}
          <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="label-caps text-primary">Performance</p><h2 className="mt-2 font-serif text-3xl">Revenue overview</h2></div>
              <span className="hidden items-center gap-2 text-xs text-on-surface-variant sm:flex"><span className="h-2.5 w-2.5 rounded-full bg-primary-container" />Monthly</span>
            </div>
            {data.monthlyRevenue.some(m => m.value > 0) ? (
              <div className="mt-8 h-64 w-full">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full overflow-visible" role="img" aria-label="Revenue trend over 7 months">
                  <defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff6b9d" stopOpacity="0.26" /><stop offset="100%" stopColor="#ff6b9d" stopOpacity="0" /></linearGradient></defs>
                  <path d={fillPath + ' Z'} fill="url(#revenue-fill)" />
                  <path d={linePath} fill="none" stroke="#ff6b9d" strokeLinecap="round" strokeWidth="3" />
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#ff6b9d" />
                      <text x={p.x} y={chartHeight - 2} textAnchor="middle" className="fill-on-surface-variant text-[10px]">{data.monthlyRevenue[i].month}</text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="mt-8 h-64 flex items-center justify-center text-sm text-on-surface-variant">
                <p>No revenue data yet. Orders will appear here.</p>
              </div>
            )}
          </article>

          {/* Order distribution */}
          <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary"><BarChart3 className="h-5 w-5" /></span>
              <div><p className="label-caps text-primary">Mix</p><h2 className="mt-2 font-serif text-3xl">Order distribution</h2></div>
            </div>
            {distribution.length > 0 ? (
              <div className="mt-10 space-y-7">
                {distribution.map(({ status, label, percent, color }) => (
                  <div key={status}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-on-surface-variant">{label}</span>
                      <span className="font-semibold">{percent}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface-container">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-10 text-center text-sm text-on-surface-variant">
                <p>No orders to display distribution.</p>
              </div>
            )}
          </article>
        </section>

        {/* Recent orders + quick stats */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            {data.recentOrders.length > 0 ? (
              <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl">Recent orders</h3>
                  <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {data.recentOrders.slice(0, 5).map(order => {
                    const meta = ORDER_STATUS_MAP[order.status as keyof typeof ORDER_STATUS_MAP]
                    return (
                      <div key={order.id} className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface p-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface-variant">{order.order_number?.slice(-4) ?? order.id.slice(0, 4)}</span>
                          <div>
                            <p className="text-sm font-medium">{order.customer_name}</p>
                            <p className="text-xs text-on-surface-variant">{formatINR(order.total)}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">{meta?.label ?? order.status}</span>
                      </div>
                    )
                  })}
                </div>
              </article>
            ) : (
              <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow">
                <h3 className="font-serif text-xl">Recent orders</h3>
                <div className="mt-8 text-center text-sm text-on-surface-variant">
                  <ShoppingBag className="mx-auto h-8 w-8 text-outline" />
                  <p className="mt-3">No orders yet. They will appear here once placed.</p>
                </div>
              </article>
            )}
          </div>

          <div className="space-y-4">
            <QuickStat icon={PackageCheck} label="Shipped this week" value={String(data.shippedThisWeek)} />
            <QuickStat icon={Box} label="In production" value={`${data.itemsProcessingCount} items`} />
            <QuickStat icon={ShoppingBag} label="Pending COD" value={formatINR(data.pendingCODTotal)} />
          </div>
        </section>
      </div>
    </div>
  )
}

function QuickStat({ icon: Icon, label, value }: { icon: typeof PackageCheck; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-admin-border bg-surface p-4 admin-shadow">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-primary"><Icon className="h-5 w-5" /></span>
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}
