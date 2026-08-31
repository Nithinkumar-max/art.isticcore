'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Search, UserRound } from 'lucide-react'

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string
  city: string
  state: string
  pincode: string
  orders: number
  spent: number
  lastOrder: string | null
  active: boolean
}

function formatINR(n: number) {
  if (n === 0) return '\u20B90'
  return '\u20B9' + n.toLocaleString('en-IN')
}

function formatDate(iso: string | null) {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PincodePage() {
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    fetch(`/api/admin/customers?search=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => { setCustomers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setCustomers([]); setLoading(false) })
  }, [query])

  const filtered = useMemo(() => customers, [customers])
  const allSelected = filtered.length > 0 && filtered.every((c) => selected.includes(c.id))

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="bg-admin-canvas px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-primary">Relationship management</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">Customers</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Know where the next handmade journey begins.</p>
          </div>
          <div className="flex gap-2">
            <label className="relative hidden sm:block">
              <span className="sr-only">Search customers</span>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers..."
                className="focus-ring w-56 rounded-full border border-admin-border bg-surface px-11 py-2.5 text-sm"
              />
            </label>
            <button type="button" className="focus-ring flex min-h-11 items-center gap-2 rounded-full border-2 border-primary px-4 text-sm font-semibold text-primary hover:bg-background-soft-pink">
              <Download className="h-4 w-4" />Export CSV
            </button>
          </div>
        </div>

        <section className="mt-7 overflow-hidden rounded-3xl border border-admin-border bg-surface admin-shadow">
          <div className="flex items-center justify-between border-b border-outline-variant bg-background-soft-pink px-5 py-3 text-sm text-primary">
            <span>{selected.length} customer{selected.length === 1 ? '' : 's'} selected</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-on-surface-variant">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm">Loading customers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <UserRound className="mx-auto h-10 w-10 text-outline" />
              <p className="mt-4 font-serif text-xl text-on-surface">No customers yet</p>
              <p className="mt-2 text-sm text-on-surface-variant">Customers will appear here once they register or place orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-admin-border">
                  <tr>
                    <th className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? [] : filtered.map(c => c.id))}
                        className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary-container"
                      />
                    </th>
                    <th className="px-5 py-4 font-medium text-on-surface-variant">Customer</th>
                    <th className="px-5 py-4 font-medium text-on-surface-variant">Location</th>
                    <th className="px-5 py-4 font-medium text-on-surface-variant">Orders</th>
                    <th className="px-5 py-4 font-medium text-on-surface-variant">Total spent</th>
                    <th className="px-5 py-4 font-medium text-on-surface-variant">Last order</th>
                    <th className="px-5 py-4 font-medium text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filtered.map((customer) => (
                    <tr key={customer.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(customer.id)}
                          onChange={() => toggleSelect(customer.id)}
                          className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary-container"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-primary">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-on-surface-variant">{customer.email || customer.phone || '\u2014'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">
                        {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state || '\u2014'}
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">{customer.orders}</td>
                      <td className="px-5 py-4 font-medium">{formatINR(customer.spent)}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{formatDate(customer.lastOrder)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${customer.active ? 'bg-[#e7f8ef] text-success' : 'bg-surface-container text-on-surface-variant'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${customer.active ? 'bg-success' : 'bg-outline'}`} />
                          {customer.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
