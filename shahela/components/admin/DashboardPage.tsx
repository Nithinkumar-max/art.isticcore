'use client'

import { ArrowUpRight, Banknote, BarChart3, Box, CircleDollarSign, PackageCheck, ShoppingBag, Sparkles, TrendingUp, Wrench } from 'lucide-react'
import { useState } from 'react'

const metrics = [
  { label: 'Total revenue', value: '₹2,45,680', delta: '+12.5%', icon: CircleDollarSign, tone: 'positive' },
  { label: 'Total orders', value: '1,248', delta: '+8.2%', icon: ShoppingBag, tone: 'positive' },
  { label: 'In production', value: '42 items', delta: 'Active', icon: Wrench, tone: 'neutral' },
  { label: 'Pending COD', value: '₹18,500', delta: 'Action needed', icon: Banknote, tone: 'warning' },
] as const

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

export function DashboardPage() {
  const [period, setPeriod] = useState('6 months')

  return (
    <div className="bg-admin-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-primary-fixed to-primary-fixed-dim p-6 sm:p-8">
          <Sparkles className="absolute -right-8 -top-10 h-48 w-48 text-primary opacity-15" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="label-caps text-on-primary-fixed-variant">Good morning, Art.isticcore</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold text-on-primary-fixed sm:text-5xl">Your studio is glowing.</h2>
              <p className="mt-2 text-sm text-on-primary-fixed-variant sm:text-base">You have 12 new orders to fulfill today.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-white/30 bg-white/50 p-4 backdrop-blur-sm">
                <p className="text-xs text-on-primary-fixed-variant">Today’s sales</p>
                <p className="mt-2 font-serif text-2xl text-on-primary-fixed">₹12,450</p>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/50 p-4 backdrop-blur-sm">
                <p className="text-xs text-on-primary-fixed-variant">Items to ship</p>
                <p className="mt-2 font-serif text-2xl text-on-primary-fixed">8</p>
              </div>
            </div>
          </div>
        </section>

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

        <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="label-caps text-primary">Performance</p><h2 className="mt-2 font-serif text-3xl">Revenue overview</h2></div>
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-2 text-xs text-on-surface-variant sm:flex"><span className="h-2.5 w-2.5 rounded-full bg-primary-container" />Monthly growth</span>
                <select value={period} onChange={(event) => setPeriod(event.target.value)} className="focus-ring rounded-full border border-admin-border bg-surface-container-low px-3 py-2 text-xs"><option>6 months</option><option>12 months</option></select>
              </div>
            </div>
            <div className="mt-8 h-64 w-full">
              <svg viewBox="0 0 700 240" className="h-full w-full overflow-visible" role="img" aria-label="Revenue trending upward from January through July">
                <defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff6b9d" stopOpacity="0.26" /><stop offset="100%" stopColor="#ff6b9d" stopOpacity="0" /></linearGradient></defs>
                <path d="M0 190 C 80 178, 108 170, 175 177 S 280 184, 350 164 S 430 130, 490 94 S 610 30, 700 16 L700 240 L0 240 Z" fill="url(#revenue-fill)" />
                <path d="M0 190 C 80 178, 108 170, 175 177 S 280 184, 350 164 S 430 130, 490 94 S 610 30, 700 16" fill="none" stroke="#ff6b9d" strokeLinecap="round" strokeWidth="5" />
                <circle cx="700" cy="16" r="6" fill="#ff6b9d" />
              </svg>
              <div className="mt-1 flex justify-between text-[11px] text-on-surface-variant/70">{months.map((month) => <span key={month}>{month}</span>)}</div>
            </div>
          </article>

          <article className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-7">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-soft-pink text-primary"><BarChart3 className="h-5 w-5" /></span><div><p className="label-caps text-primary">Mix</p><h2 className="mt-2 font-serif text-3xl">Order distribution</h2></div></div>
            <div className="mt-10 space-y-7">
              {[['Flowers', 45, 'bg-primary-container'], ['Toys', 30, 'bg-secondary-container'], ['Apparel', 25, 'bg-tertiary-container']].map(([label, value, color]) => (
                <div key={label as string}><div className="mb-2 flex justify-between text-sm"><span className="text-on-surface-variant">{label}</span><span className="font-semibold">{value}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-surface-container"><div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} /></div></div>
              ))}
            </div>
            <div className="mt-10 rounded-2xl bg-background-warm p-4"><p className="text-xs text-on-surface-variant">This week’s focus</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary">Keep floral orders moving <ArrowUpRight className="h-4 w-4" /></p></div>
          </article>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <QuickStat icon={PackageCheck} label="Ready to ship" value="8 parcels" />
          <QuickStat icon={Box} label="Low-stock variants" value="3 to review" />
          <QuickStat icon={ShoppingBag} label="Custom briefs" value="5 new" />
        </section>
      </div>
    </div>
  )
}

function QuickStat({ icon: Icon, label, value }: { icon: typeof PackageCheck; label: string; value: string }) {
  return <div className="flex items-center gap-4 rounded-2xl border border-admin-border bg-surface p-4 admin-shadow"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-xs text-on-surface-variant">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div></div>
}
