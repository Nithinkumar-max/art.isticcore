'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ImageOff, MessageCircle, Phone, Save, Trash2, X } from 'lucide-react'
import type { CustomDesignRequest } from '@/types'

const STATUS_TONES: Record<CustomDesignRequest['status'], string> = {
  NEW: 'bg-[#fff0f1] text-[#d84c55]',
  CONTACTED: 'bg-[#eef5ff] text-[#427bd1]',
  QUOTED: 'bg-[#fff5df] text-secondary',
  IN_DISCUSSION: 'bg-background-soft-pink text-primary',
  CONVERTED: 'bg-[#eaf8ee] text-success',
  COMPLETED: 'bg-surface-container text-on-surface',
  REJECTED: 'bg-surface-container text-on-surface-variant',
}

const VALID_STATUSES: CustomDesignRequest['status'][] = ['NEW', 'CONTACTED', 'QUOTED', 'IN_DISCUSSION', 'CONVERTED', 'COMPLETED', 'REJECTED']

function formatDate(value: string | null) {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return value }
}

export default function AdminCustomRequestsRoute() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: requests, isLoading, error } = useQuery<CustomDesignRequest[]>({
    queryKey: ['admin-custom-designs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/custom-designs')
      if (!res.ok) throw new Error('Failed to load custom requests')
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { status?: string; admin_notes?: string; quoted_price?: number } }) => {
      const res = await fetch(`/api/admin/custom-designs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-designs'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/custom-designs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-designs'] })
      setSelectedId(null)
      setConfirmDeleteId(null)
    },
  })

  const newCount = (requests ?? []).filter((r) => r.status === 'NEW').length
  const selected = (requests ?? []).find((r) => r.id === selectedId) ?? null

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-admin-canvas px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-primary">Bespoke queue</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">Custom requests</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{requests?.length ?? 0} total briefs from customers.</p>
          </div>
          {newCount ? <span className="rounded-full bg-primary-container px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">{newCount} new</span> : null}
        </div>

        {isLoading ? (
          <div className="mt-7 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-admin-border bg-surface" aria-hidden="true" />)}</div>
        ) : error ? (
          <div className="mt-7 rounded-3xl border border-admin-border bg-surface p-8 text-center text-sm text-error admin-shadow">Could not load requests.</div>
        ) : !requests?.length ? (
          <div className="mt-7 rounded-3xl border border-admin-border bg-surface p-10 text-center admin-shadow">
            <p className="label-caps text-primary">All clear</p>
            <h3 className="mt-2 font-serif text-2xl">No custom requests yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">When customers submit the bespoke form from /custom-order, every brief lands here.</p>
          </div>
        ) : (
          <div className="mt-7 space-y-2">
            {requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
                className="flex w-full items-center gap-4 rounded-2xl border border-admin-border bg-surface px-4 py-3 text-left transition hover:border-primary hover:bg-background-warm admin-shadow sm:px-5"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${request.status === 'NEW' ? 'bg-[#d84c55] animate-pulse' : 'bg-outline'}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-serif text-sm font-semibold">{request.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_TONES[request.status] ?? ''}`}>{request.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{request.contact}</span>
                    {request.email ? <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{request.email}</span> : null}
                    <span className="ml-auto shrink-0">{formatDate(request.created_at)}</span>
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs text-on-surface-variant sm:block">{request.budget ? `₹${request.budget.toLocaleString('en-IN')}` : '—'}</span>
                <span className="shrink-0 text-xs text-on-surface-variant">{request.description.slice(0, 30)}...</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail side panel */}
      <AnimatePresence>
        {selected ? (
          <div className="fixed inset-0 z-50">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-surface p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-caps text-primary">Custom request</p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold">{selected.name}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_TONES[selected.status]}`}>{selected.status.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-on-surface-variant">{formatDate(selected.created_at)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="focus-ring rounded-full bg-surface-container-low p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-background-warm p-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface">{selected.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                    <dt className="text-xs text-on-surface-variant">Phone</dt>
                    <dd className="mt-0.5 font-medium">{selected.contact}</dd>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                    <dt className="text-xs text-on-surface-variant">Email</dt>
                    <dd className="mt-0.5 font-medium">{selected.email || '—'}</dd>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                    <dt className="text-xs text-on-surface-variant">Budget</dt>
                    <dd className="mt-0.5 font-medium">{selected.budget ? `₹${selected.budget.toLocaleString('en-IN')}` : 'Not specified'}</dd>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                    <dt className="text-xs text-on-surface-variant">Deadline</dt>
                    <dd className="mt-0.5 font-medium">{formatDate(selected.deadline)}</dd>
                  </div>
                </div>

                <div>
                  <p className="label-caps text-on-surface-variant">Reference images ({selected.reference_images?.length ?? 0})</p>
                  {selected.reference_images?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.reference_images.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="focus-ring block overflow-hidden rounded-2xl border border-admin-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Reference from ${selected.name}`} loading="lazy" className="h-24 w-24 object-cover transition hover:scale-105" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-container-low px-4 py-3 text-xs text-on-surface-variant"><ImageOff className="h-4 w-4" />No images attached</p>
                  )}
                </div>
              </div>

              {/* Admin controls */}
              <div className="mt-6 space-y-3 rounded-2xl border border-admin-border p-4">
                <p className="label-caps text-on-surface-variant">Admin controls</p>
                <RequestControls request={selected} onUpdate={updateMutation.mutate} isUpdating={updateMutation.isPending} onDelete={() => setConfirmDeleteId(selected.id)} />
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDeleteId ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeleteId(null)} />
            <motion.div
              className="relative w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="font-serif text-xl font-semibold">Delete request?</h3>
              <p className="mt-2 text-sm text-on-surface-variant">This action cannot be undone. The customer&apos;s brief and reference images will be permanently removed.</p>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setConfirmDeleteId(null)} className="focus-ring flex-1 rounded-full border-2 border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary">Cancel</button>
                <button type="button" onClick={() => deleteMutation.mutate(confirmDeleteId)} disabled={deleteMutation.isPending} className="focus-ring flex-1 rounded-full bg-error px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c62828] disabled:opacity-60">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function RequestControls({ request, onUpdate, isUpdating, onDelete }: { request: CustomDesignRequest; onUpdate: (args: { id: string; updates: { status?: string; admin_notes?: string; quoted_price?: number } }) => void; isUpdating: boolean; onDelete: () => void }) {
  const [status, setStatus] = useState(request.status)
  const [adminNotes, setAdminNotes] = useState(request.admin_notes ?? '')
  const [quotedPrice, setQuotedPrice] = useState(request.quoted_price?.toString() ?? '')
  const [saved, setSaved] = useState(false)

  const hasChanges = status !== request.status || adminNotes !== (request.admin_notes ?? '') || quotedPrice !== (request.quoted_price?.toString() ?? '')

  const handleSave = () => {
    const updates: { status?: string; admin_notes?: string; quoted_price?: number } = {}
    if (status !== request.status) updates.status = status
    if (adminNotes !== (request.admin_notes ?? '')) updates.admin_notes = adminNotes
    if (quotedPrice !== (request.quoted_price?.toString() ?? '')) updates.quoted_price = quotedPrice ? Number(quotedPrice) : undefined
    onUpdate({ id: request.id, updates })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-on-surface-variant">Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value as CustomDesignRequest['status'])} className="form-input mt-1">
          {VALID_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-on-surface-variant">Quoted price (₹)</span>
        <input type="number" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} placeholder="e.g. 5000" className="form-input mt-1" />
      </label>
      <label className="block">
        <span className="text-sm text-on-surface-variant">Admin notes</span>
        <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes..." className="form-input mt-1 resize-y rounded-2xl" />
      </label>
      <div className="flex gap-2">
        {hasChanges ? (
          <button type="button" onClick={handleSave} disabled={isUpdating} className="focus-ring flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
            <Save className="h-4 w-4" />{isUpdating ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        ) : null}
        <button type="button" onClick={onDelete} className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-full border border-error/40 px-4 text-sm font-medium text-error hover:bg-[#fff0f0]">
          <Trash2 className="h-4 w-4" />Delete
        </button>
      </div>
    </div>
  )
}
