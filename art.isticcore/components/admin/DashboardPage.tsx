'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, CircleDollarSign, Gauge, PackageCheck, PieChart, ReceiptText, ShoppingBag, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import Link from 'next/link'
import { ORDER_STATUS_MAP } from '@/lib/utils'

interface DashboardData {
  totalRevenue: number
  last30DaysRevenue: number
  last7DaysRevenue: number
  totalOrders: number
  ordersToday: number
  avgOrderValue: number
  shippedThisWeek: number
  itemsProcessingCount: number
  monthlyRevenue: { month: string; value: number }[]
  dailyRevenue: { date: string; value: number }[]
  dailyOrders: { date: string; count: number }[]
  statusCounts: Record<string, number>
  topProducts: { name: string; quantity: number; revenue: number }[]
  recentOrders: { id: string; order_number: string; status: string; total: number; created_at: string; customer_name: string }[]
}

const STATUS_HEX: Record<string, string> = {
  confirmed: '#f0a440',
  preparing: '#8f7cff',
  ready_for_dispatch: '#427bd1',
  handed_over: '#2f9e6a',
  cancelled: '#9aa3ad',
  refunded: '#b9bec6',
}
const STATUS_FALLBACK_HEX = '#c7ccd3'

function formatINR(n: number) {
  if (n === 0) return '\u20B90'
  return '\u20B9' + n.toLocaleString('en-IN')
}

const chartTooltip = {
  theme: '#33272c',
  label: '#d9ccd1',
  value: '#fff7f9',
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
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface-container-low" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-admin-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1400px] py-20 text-center text-on-surface-variant">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  const metrics = [
    { label: 'Total revenue', value: formatINR(data.totalRevenue), delta: `Last 30d · ${formatINR(data.last30DaysRevenue)}`, icon: CircleDollarSign, tone: 'positive' as const },
    { label: 'Total orders', value: String(data.totalOrders), delta: `${data.ordersToday} today`, icon: ShoppingBag, tone: 'positive' as const },
    { label: 'Avg order value', value: formatINR(data.avgOrderValue), delta: `Across ${data.totalOrders} orders`, icon: ReceiptText, tone: 'positive' as const },
    { label: 'Delivered this week', value: String(data.shippedThisWeek), delta: data.shippedThisWeek > 0 ? 'Fulfilled' : 'No deliveries', icon: PackageCheck, tone: data.shippedThisWeek > 0 ? 'positive' as const : 'neutral' as const },
  ]

  const bestSeller = data.topProducts[0]

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
                <p className="text-xs text-on-primary-fixed-variant">In production</p>
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
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone === 'positive' ? 'bg-[#e7f8ef] text-success' : 'bg-surface-container text-on-surface-variant'}`}>
                  {tone === 'positive' ? <TrendingUp className="h-3.5 w-3.5" /> : null}{delta}
                </span>
              </div>
              <p className="mt-7 text-sm text-on-surface-variant">{label}</p>
              <p className="mt-1 font-serif text-3xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        {/* Interactive charts row */}
        <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <RevenueChart monthly={data.monthlyRevenue} daily={data.dailyRevenue} />
          <StatusDonut counts={data.statusCounts} />
        </section>

        {/* Additional analytics row */}
        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <TopProductsCard items={data.topProducts} />
          <OrderVolumeBars daily={data.dailyOrders} />
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
            <QuickStat icon={Gauge} label="Avg order value" value={formatINR(data.avgOrderValue)} />
            <QuickStat icon={Trophy} label="Best seller this month" value={`${bestSeller?.name ?? 'No sales yet'}${bestSeller ? ` · ${bestSeller.quantity} sold` : ''}`} />
            <QuickStat icon={TrendingUp} label="Revenue · last 7 days" value={formatINR(data.last7DaysRevenue)} />
          </div>
        </section>
      </div>
    </div>
  )
}

function QuickStat({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-admin-border bg-surface p-4 admin-shadow">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-primary"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

// ─── Interactive revenue chart ────────────────────────────────────────────────

type Range = '7d' | '14d' | 'monthly'

function RevenueChart({ monthly, daily }: { monthly: { month: string; value: number }[]; daily: { date: string; value: number }[] }) {
  const [range, setRange] = useState<Range>('monthly')
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const rawData = range === 'monthly' ? monthly : range === '14d' ? daily.slice(-14) : daily.slice(-7)
  const data = rawData.map(d => ({ label: ('month' in d ? d.month : d.date) ?? '', value: d.value }))
  const W = 700
  const H = 240
  const P = 12
  const max = Math.max(...data.map(d => d.value), 1)
  const points = data.map((d, i) => ({
    label: d.label,
    value: d.value,
    x: P + (i / Math.max(data.length - 1, 1)) * (W - P * 2),
    y: H - P - (d.value / max) * (H - P * 2),
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fillPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${H - P} L ${points[0]?.x ?? 0} ${H - P} Z`

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    let bestDist = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(p.x - vx)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setHover(best)
  }

  const hp = hover != null ? points[hover] : null

  return (
    <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary"><BarChart3 className="h-5 w-5" /></span>
          <div>
            <p className="label-caps text-primary">Performance</p>
            <h2 className="mt-2 font-serif text-3xl">Revenue overview</h2>
          </div>
        </div>
        <span className="flex rounded-full bg-surface-container p-0.5 text-xs font-semibold">
          {(['7d', '14d', 'monthly'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setRange(r); setHover(null) }}
              className={`rounded-full px-3 py-1.5 transition ${range === r ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
            >
              {r === 'monthly' ? 'Monthly' : r.toUpperCase()}
            </button>
          ))}
        </span>
      </div>

      {data.some(d => d.value > 0) ? (
        <div className="mt-8 h-64 w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={`Revenue trend — ${range === 'monthly' ? '7 months' : `${range === '14d' ? 14 : 7} days`}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ff6b9d" stopOpacity="0.26" />
                <stop offset="100%" stopColor="#ff6b9d" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={fillPath} fill="url(#revenue-fill)" />
            <path d={linePath} fill="none" stroke="#ff6b9d" strokeLinecap="round" strokeWidth="3" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 7 : 5} fill={hover === i ? '#ff4d8d' : '#ff6b9d'} className="transition-all duration-150" />
            ))}
            {points.map((p, i) => (
              <text key={i} x={p.x} y={H - 2} textAnchor="middle" className="fill-on-surface-variant text-[10px]">{p.label}</text>
            ))}
            {hp ? (
              <g>
                <line x1={hp.x} y1={P} x2={hp.x} y2={H - P} stroke="#ff6b9d" strokeDasharray="3 4" opacity="0.5" />
                <g transform={`translate(${Math.min(Math.max(hp.x, 66), W - 66)}, ${Math.max(hp.y - 52, 4)})`}>
                  <rect x="-60" y="-14" width="120" height="42" rx="11" fill={chartTooltip.theme} />
                  <text x="0" y="3" textAnchor="middle" fontSize="11" fill={chartTooltip.label}>{hp.label}</text>
                  <text x="0" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill={chartTooltip.value}>{formatINR(hp.value)}</text>
                </g>
              </g>
            ) : null}
          </svg>
        </div>
      ) : (
        <div className="mt-8 flex h-64 items-center justify-center text-sm text-on-surface-variant">
          <p>No revenue data yet. Orders will appear here.</p>
        </div>
      )}
    </article>
  )
}

// ─── Order distribution donut ─────────────────────────────────────────────────

function StatusDonut({ counts }: { counts: Record<string, number> }) {
  const [active, setActive] = useState<number | null>(null)
  const entries = Object.entries(counts).filter(([, c]) => c > 0)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  const R = 60
  const C = 2 * Math.PI * R

  if (total === 0) {
    return (
      <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary"><PieChart className="h-5 w-5" /></span>
          <div><p className="label-caps text-primary">Mix</p><h2 className="mt-2 font-serif text-3xl">Order distribution</h2></div>
        </div>
        <div className="mt-10 text-center text-sm text-on-surface-variant">
          <p>No orders to display distribution.</p>
        </div>
      </article>
    )
  }

  let acc = 0
  const segs = entries.map(([status, count]) => {
    const len = (count / total) * C
    const seg = {
      status,
      count,
      frac: count / total,
      len,
      offset: acc,
      color: STATUS_HEX[status] ?? STATUS_FALLBACK_HEX,
    }
    acc += len
    return seg
  })

  const activeSeg = active != null ? segs[active] : null

  return (
    <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary"><PieChart className="h-5 w-5" /></span>
        <div><p className="label-caps text-primary">Mix</p><h2 className="mt-2 font-serif text-3xl">Order distribution</h2></div>
      </div>

      <div className="relative mx-auto mt-6 h-52 w-52">
        <svg viewBox="0 0 160 160" className="h-full w-full">
          <g transform="rotate(-90 80 80)">
            {segs.map((s, i) => (
              <circle
                key={s.status}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={active === i ? 24 : 15}
                strokeDasharray={`${Math.max(s.len - (active === i ? 1.5 : 0), 0.5)} ${C}`}
                strokeDashoffset={-s.offset}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-serif text-3xl font-semibold">{activeSeg ? String(activeSeg.count) : String(total)}</p>
          <p className="max-w-[9rem] truncate text-xs text-on-surface-variant">
            {activeSeg ? (ORDER_STATUS_MAP[activeSeg.status as keyof typeof ORDER_STATUS_MAP]?.label ?? activeSeg.status) : 'orders'}
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2">
        {segs.map((s, i) => (
          <li
            key={s.status}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition hover:bg-surface-container-low"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-on-surface-variant">{ORDER_STATUS_MAP[s.status as keyof typeof ORDER_STATUS_MAP]?.label ?? s.status}</span>
            <span className="ml-auto font-semibold">{s.count}</span>
            <span className="w-10 text-right text-xs text-on-surface-variant">{Math.round(s.frac * 100)}%</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

// ─── Top products ─────────────────────────────────────────────────────────────

function TopProductsCard({ items }: { items: { name: string; quantity: number; revenue: number }[] }) {
  const maxQ = Math.max(...items.map(i => i.quantity), 1)
  return (
    <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary"><Trophy className="h-5 w-5" /></span>
        <div><p className="label-caps text-primary">Bestsellers</p><h2 className="mt-2 font-serif text-3xl">Top products · 30 days</h2></div>
      </div>

      {items.length > 0 ? (
        <ul className="mt-7 space-y-4">
          {items.map((item, i) => (
            <li key={item.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-on-surface-variant">{i + 1}</span>
                  <span className="truncate font-medium">{item.name}</span>
                </span>
                <span className="shrink-0 text-xs text-on-surface-variant">{item.quantity} sold · {formatINR(item.revenue)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary" style={{ width: `${(item.quantity / maxQ) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 text-center text-sm text-on-surface-variant">
          <ShoppingBag className="mx-auto h-8 w-8 text-outline" />
          <p className="mt-3">No sales in the last 30 days.</p>
        </div>
      )}
    </article>
  )
}

// ─── Daily order volume bars ──────────────────────────────────────────────────

function OrderVolumeBars({ daily }: { daily: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 560
  const H = 200
  const P = 8
  const baseline = H - P
  const max = Math.max(...daily.map(d => d.count), 1)
  const n = Math.max(daily.length, 1)
  const slot = (W - P * 2) / n
  const barW = Math.min(slot * 0.55, 28)

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.min(Math.max(Math.floor((vx - P) / slot), 0), daily.length - 1)
    setHover(idx)
  }

  const maxBarHeight = H - P * 2 - 18

  return (
    <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary"><TrendingUp className="h-5 w-5" /></span>
        <div><p className="label-caps text-primary">Volume</p><h2 className="mt-2 font-serif text-3xl">Orders · last 14 days</h2></div>
      </div>

      {daily.some(d => d.count > 0) ? (
        <div className="mt-8 h-56 w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full overflow-visible"
            role="img"
            aria-label="Daily order count over 14 days"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {daily.map((d, i) => {
              const h = Math.max((d.count / max) * maxBarHeight, 2)
              const x = P + i * slot + (slot - barW) / 2
              const y = baseline - h
              const active = hover === i
              return (
                <g key={i} className="cursor-pointer">
                  <rect x={x} y={y} width={barW} height={h} rx={Math.min(barW / 2, 8)}
                    fill={active ? '#ff4d8d' : 'rgba(255,107,157,0.45)'}
                    className="transition-all duration-150" />
                  <text x={P + i * slot + slot / 2} y={H - 2} textAnchor="middle" className="fill-on-surface-variant text-[9px]">{i % 2 === 0 ? d.date : ''}</text>
                  {active ? (
                    <g transform={`translate(${Math.min(Math.max(P + i * slot + slot / 2, 46), W - 46)}, ${Math.max(y - 40, 8)})`}>
                      <rect x="-44" y="-12" width="88" height="34" rx="11" fill={chartTooltip.theme} />
                      <text x="0" y="7" textAnchor="middle" fontSize="11" fill={chartTooltip.label}>{d.date}</text>
                      <text x="0" y="18" textAnchor="middle" fontSize="12" fontWeight="700" fill={chartTooltip.value}>{d.count} order{d.count === 1 ? '' : 's'}</text>
                    </g>
                  ) : null}
                </g>
              )
            })}
          </svg>
        </div>
      ) : (
        <div className="mt-8 flex h-56 items-center justify-center text-sm text-on-surface-variant">
          <p>No orders in the last 14 days.</p>
        </div>
      )}
    </article>
  )
}