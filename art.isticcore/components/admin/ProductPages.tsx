'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Info, Plus, Save, Search, Trash2, Upload } from 'lucide-react'
import { ProductSchema } from '@/lib/validations'
import { useProductFormStore } from '@/store/productFormStore'
import { ProductPreviewCard } from './ProductPreviewCard'
import { ReauthModal } from './ReauthModal'
import type { Category, PaginatedResponse, ProductWithRelations } from '@/types'

export type ProductEditorSection = 'basic' | 'media'

const tabs: Array<{ id: ProductEditorSection; label: string }> = [
  { id: 'basic', label: 'Basic info' },
  { id: 'media', label: 'Media' },
]

export function ProductListPage() {
  const [query, setQuery] = useState('')
  const { data, isLoading } = useQuery<PaginatedResponse<ProductWithRelations>>({
    queryKey: ['admin-products-list'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=48&page=1&sort=newest')
      if (!res.ok) throw new Error('Failed to load products')
      return res.json()
    },
  })
  const products = useMemo(() => data?.data ?? [], [data])
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.slug}`.toLowerCase().includes(query.toLowerCase())), [products, query])

  return (
    <div className="bg-admin-canvas px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-primary">Catalog control</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">Products</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{data ? `${data.total} pieces in the catalog` : 'Shape the pieces your customers discover.'}</p>
          </div>
          <Link href="/admin/products/new" className="focus-ring flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-5 text-sm font-semibold text-on-primary-container shadow-[0_8px_22px_rgba(255,107,157,0.25)] hover:bg-primary-dark hover:text-white">
            <Plus className="h-4 w-4" />Add product
          </Link>
        </div>
        <label className="relative mt-7 block w-full sm:w-80">
          <span className="sr-only">Search inventory</span>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inventory..." className="focus-ring w-full rounded-full border border-admin-border bg-surface px-11 py-2.5 text-sm placeholder:text-on-surface-variant/70" />
        </label>
        <div className="mt-5 overflow-x-auto rounded-3xl border border-admin-border bg-surface p-2 admin-shadow">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-admin-border text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>{['Piece', 'Category', 'Price', 'Status', ''].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {isLoading ? [0, 1, 2, 3].map((index) => (
                <tr key={index}><td colSpan={5} className="px-4 py-4"><div className="h-10 animate-pulse rounded-xl bg-surface-container-low" aria-hidden="true" /></td></tr>
              )) : filtered.map((product) => (
                <tr key={product.id} className="group">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface-container-low"><img src={product.images?.[0]?.url || '/images/product-placeholder.svg'} alt="" className="h-full w-full object-cover" /></div>
                      <div><p className="font-medium group-hover:text-primary">{product.name}</p><p className="text-xs text-on-surface-variant">{product.slug}</p></div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{product.category?.name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-right">{product.discount_price ? <span><span className="text-on-surface-variant line-through">₹{product.base_price}</span> ₹{product.discount_price}</span> : `₹${product.base_price}`}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs ${product.is_active ? 'bg-[#eaf8ee] text-success' : 'bg-surface-container text-on-surface-variant'}`}>{product.is_active ? 'Active' : 'Draft'}</span></td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/products/${product.id}`} className="focus-ring rounded-full border border-admin-border px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function ProductEditorPage({ section = 'basic', productId = 'new' }: { section?: ProductEditorSection; productId?: string }) {
  const baseHref = productId === 'new' ? '/admin/products/new' : `/admin/products/${productId}`
  const title = productId === 'new' ? 'Add new product' : 'Product'
  const description = productId === 'new' ? 'Create a new piece for Art.isticcore.' : 'Manage product details and images.'
  const [saved, setSaved] = useState(false)
  const changeSection = () => setSaved(false)
  return <div className="bg-admin-canvas px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1400px]"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="label-caps text-primary">Products / {productId === 'new' ? 'New piece' : title}</p><h2 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{description}</p></div><div className="flex gap-2"><Link href="/admin/products" className="focus-ring rounded-full border-2 border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary">Back to products</Link><button type="submit" form="product-basic-form" className="focus-ring flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(255,107,157,0.25)] hover:bg-primary-dark"><Save className="h-4 w-4" />{saved ? 'Saved' : 'Save changes'}</button></div></div><nav className="mt-8 flex gap-1 overflow-x-auto border-b border-admin-border" aria-label="Product editor sections">{tabs.map((tab) => <Link key={tab.id} href={`${baseHref}${tab.id === 'basic' ? '' : `/${tab.id}`}`} onClick={changeSection} className={`focus-ring whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${section === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}>{tab.label}</Link>)}</nav><div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0">{section === 'basic' ? <BasicInfoPanel productId={productId} /> : null}{section === 'media' ? <MediaPanel productId={productId} /> : null}</div>{productId !== 'new' ? <div className="xl:sticky xl:top-28"><ProductPreviewCard /></div> : null}</div></div></div>
}

function BasicInfoPanel({ productId }: { productId: string }) {
  const router = useRouter()
  const isNew = productId === 'new'
  const store = useProductFormStore()
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) return []
      return res.json()
    },
  })
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<z.input<typeof ProductSchema>, unknown, z.output<typeof ProductSchema>>({ resolver: zodResolver(ProductSchema), defaultValues: { name: '', slug: '', description: '', short_description: '', base_price: undefined as unknown as number, discount_price: undefined, category_id: '', lead_time_days: 12, is_available: true, is_active: true, is_featured: false, is_bestseller: false, seo_title: '', seo_description: '' }, mode: 'onBlur' })
  const nameValue = watch('name')

  useEffect(() => {
    if (!isNew || !nameValue) return
    const slug = nameValue.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    setValue('slug', slug)
  }, [nameValue, isNew, setValue])

  // Sync form values to preview store (useRef to avoid infinite loop)
  const prevFormRef = useRef<string>('')
  const watchedAll = watch()
  useEffect(() => {
    const snapshot = JSON.stringify(watchedAll)
    if (snapshot === prevFormRef.current) return
    prevFormRef.current = snapshot
    store.setField('name', watchedAll.name || '')
    store.setField('slug', watchedAll.slug || '')
    store.setField('description', watchedAll.description || '')
    store.setField('short_description', watchedAll.short_description || '')
    store.setField('base_price', (watchedAll.base_price as number | undefined) ?? null)
    store.setField('discount_price', (watchedAll.discount_price as number | undefined) ?? null)
    store.setField('category_id', watchedAll.category_id || '')
    store.setField('is_available', watchedAll.is_available ?? true)
    store.setField('is_active', watchedAll.is_active ?? true)
    store.setField('is_featured', watchedAll.is_featured ?? false)
    store.setField('is_bestseller', watchedAll.is_bestseller ?? false)
    store.setField('seo_title', watchedAll.seo_title || '')
    store.setField('seo_description', watchedAll.seo_description || '')
  }, [watchedAll, store])

  // ── Edit mode: fetch existing product + collections, populate form ──
  const { data: existingProduct, isLoading: loadingExisting, error: loadError } = useQuery({
    queryKey: ['admin-product', productId],
    enabled: !isNew,
    queryFn: async () => {
      const res = await fetch(`/api/admin/products/${productId}`)
      if (!res.ok) throw new Error('Could not load product')
      const json = await res.json()
      return json as { id: string; name: string; slug: string; description: string; short_description: string | null; base_price: number; discount_price: number | null; category_id: string; lead_time_days: number; is_available: boolean; is_active: boolean; is_featured: boolean; is_bestseller: boolean; seo_title: string | null; seo_description: string | null; collection_ids: string[] }
    },
  })

  const { data: allCollections } = useQuery({
    queryKey: ['admin-collections'],
    enabled: !isNew,
    queryFn: async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('collections').select('id,name,slug').eq('is_active', true).order('display_order')
      return (data ?? []) as Array<{ id: string; name: string; slug: string }>
    },
  })

  const [editCollections, setEditCollections] = useState<string[]>([])
  const [editError, setEditError] = useState('')
  const [editSaved, setEditSaved] = useState(false)
  const [showReauth, setShowReauth] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Populate form when product loads
  useEffect(() => {
    if (!existingProduct) return
    store.initFromProduct(existingProduct)
    setValue('name', existingProduct.name)
    setValue('slug', existingProduct.slug)
    setValue('description', existingProduct.description)
    setValue('short_description', existingProduct.short_description ?? '')
    setValue('base_price', existingProduct.base_price as unknown as number)
    setValue('discount_price', existingProduct.discount_price as unknown as number)
    setValue('category_id', existingProduct.category_id)
    setValue('lead_time_days', existingProduct.lead_time_days)
    setValue('is_available', existingProduct.is_available)
    setValue('is_active', existingProduct.is_active)
    setValue('is_featured', existingProduct.is_featured)
    setValue('is_bestseller', existingProduct.is_bestseller)
    setValue('seo_title', existingProduct.seo_title ?? '')
    setValue('seo_description', existingProduct.seo_description ?? '')
    setEditCollections(existingProduct.collection_ids ?? [])
  }, [existingProduct, setValue])

  if (!isNew) {
    if (loadingExisting) {
      return <section className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-8"><div className="h-32 animate-pulse rounded-2xl bg-surface-container-low" /><p className="mt-3 text-sm text-on-surface-variant">Loading product…</p></section>
    }
    if (loadError || !existingProduct) {
      return <section className="rounded-3xl border border-error/20 bg-surface p-5 admin-shadow sm:p-8"><p className="label-caps text-error">Could not load product</p><p className="mt-2 text-sm text-on-surface-variant">{(loadError as Error)?.message ?? 'Try again.'}</p><Link href="/admin/products" className="mt-4 inline-flex rounded-full bg-primary-container px-4 py-2 text-sm text-white">Back to products</Link></section>
    }

    const submitEdit = async (values: z.output<typeof ProductSchema>) => {
      setEditError(''); setEditSaved(false)
      // optimistic: patch local cache for product list
      const { createClient: _c } = await import('@/lib/supabase/client')
      try {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, collection_ids: editCollections }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Failed to update product')
        setEditSaved(true)
        // optimistic UI — invalidate lists so storefront reflects instantly on next fetch
        // (TanStack will refetch on window focus; we also trigger manual)
        window.setTimeout(()=>setEditSaved(false), 2500)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Update failed'
        // friendly non-technical message for duplicate slug/SKU
        if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('slug')) {
          setEditError('A product with this URL slug already exists. Try a different name or slug.')
        } else {
          setEditError(msg)
        }
      }
    }

    const handleDelete = async () => {
      setDeleting(true)
      try {
        const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' })
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || 'Failed to delete product')
        }
        router.push('/admin/products')
      } catch (e) {
        setEditError(e instanceof Error ? e.message : 'Delete failed')
        setDeleting(false)
      }
    }

    return (<>
      <form id="product-basic-form" onSubmit={handleSubmit(submitEdit)} className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-8">
        <div className="flex items-center justify-between border-b border-admin-border pb-5"><div><p className="label-caps text-primary">Product content — Editing</p><h3 className="mt-2 font-serif text-3xl">Basic information</h3><p className="mt-1 font-mono text-xs text-outline">{existingProduct.id.slice(0,8)} · {existingProduct.slug}</p></div><Info className="h-5 w-5 text-primary" /></div>
        {editError ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-error">{editError}</p> : null}
        {editSaved ? <p role="status" className="mt-4 rounded-xl bg-[#effcf1] px-4 py-3 text-sm text-success">Saved — storefront will reflect on next fetch. Collection links updated.</p> : null}
        <div className="mt-7 space-y-5"><label className="block"><span className="label-caps text-on-surface-variant">Product name</span><input {...register('name')} placeholder="e.g. Hand-knit woolen cardigan" className="form-input mt-2" />{errors.name ? <FieldError>{errors.name.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">URL slug</span><input {...register('slug')} placeholder="hand-knit-woolen-cardigan" className="form-input mt-2 bg-surface-container-low" />{errors.slug ? <FieldError>{errors.slug.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">Short description</span><textarea {...register('short_description')} rows={3} placeholder="A brief story for product cards..." className="form-input mt-2 resize-y rounded-2xl" /></label><label className="block"><span className="label-caps text-on-surface-variant">Full description</span><textarea {...register('description')} rows={8} placeholder="Detailed product story, materials, and care instructions..." className="form-input mt-2 resize-y rounded-2xl bg-surface" />{errors.description ? <FieldError>{errors.description.message}</FieldError> : null}</label><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="label-caps text-on-surface-variant">Base price (?)</span><input {...register('base_price')} type="number" min="0" step="0.01" placeholder="e.g. 2500" className="form-input mt-2" />{errors.base_price ? <FieldError>{errors.base_price.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">Discounted price (?, optional)</span><input {...register('discount_price')} type="number" min="0" step="0.01" placeholder="e.g. 1999" className="form-input mt-2" />{errors.discount_price ? <FieldError>{errors.discount_price.message}</FieldError> : null}</label></div><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="label-caps text-on-surface-variant">Category</span><select {...register('category_id')} className="form-input mt-2"><option value="">Select a category.</option>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.category_id ? <FieldError>{errors.category_id.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">Lead time (days)</span><input {...register('lead_time_days')} type="number" min="1" className="form-input mt-2" />{errors.lead_time_days ? <FieldError>{errors.lead_time_days.message}</FieldError> : null}</label></div>
        {allCollections?.length ? <fieldset className="rounded-2xl border border-admin-border p-4"><legend className="label-caps px-2 text-on-surface-variant">Collections (many-to-many — updates collection_products)</legend><div className="mt-2 grid grid-cols-2 gap-2">{allCollections.map(col=>{ const checked=editCollections.includes(col.id); return <label key={col.id} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${checked?'border-primary bg-background-soft-pink text-primary':'border-admin-border'}`}><input type="checkbox" checked={checked} onChange={(e)=> setEditCollections(curr=> e.target.checked ? [...curr, col.id] : curr.filter(id=>id!==col.id))} className="h-4 w-4" />{col.name}</label>})}</div><p className="mt-2 text-xs text-on-surface-variant">Changes write to junction table <span className="font-mono">collection_products</span> and appear on storefront collection pages on next fetch.</p></fieldset> : null}
        <fieldset className="grid gap-3 rounded-2xl border border-admin-border p-4 sm:grid-cols-2"><legend className="label-caps px-2 text-on-surface-variant">Visibility</legend><label className="flex items-center justify-between gap-3 text-sm"><span>Available to order</span><input {...register('is_available')} type="checkbox" className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label><label className="flex items-center justify-between gap-3 text-sm"><span>Active on storefront</span><input {...register('is_active')} type="checkbox" className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label><label className="flex items-center justify-between gap-3 text-sm"><span>Featured</span><input {...register('is_featured')} type="checkbox" className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label><label className="flex items-center justify-between gap-3 text-sm"><span>Bestseller</span><input {...register('is_bestseller')} type="checkbox" className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label></fieldset></div><button type="submit" disabled={isSubmitting} className="focus-ring mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{isSubmitting ? 'Saving...' : editSaved ? 'Saved!' : 'Save changes'}</button>
        <button type="button" onClick={() => setShowReauth(true)} disabled={deleting} className="focus-ring mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-error/30 text-sm font-semibold text-error hover:bg-error/5 disabled:opacity-50"><Trash2 className="h-4 w-4" />{deleting ? 'Deleting...' : 'Delete product'}</button>
      </form>
      <ReauthModal open={showReauth} onClose={() => setShowReauth(false)} onVerified={handleDelete} />
    </>
    )
  }

  const submit = async (values: z.output<typeof ProductSchema>) => {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Failed to create product')
    router.push(`/admin/products/${body.product.id}/media`)
  }

  return <form id="product-basic-form" onSubmit={handleSubmit(submit)} className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-8"><div className="flex items-center justify-between border-b border-admin-border pb-5"><div><p className="label-caps text-primary">Product content</p><h3 className="mt-2 font-serif text-3xl">Basic information</h3></div><Info className="h-5 w-5 text-primary" /></div><div className="mt-7 space-y-5"><label className="block"><span className="label-caps text-on-surface-variant">Product name</span><input {...register('name')} placeholder="e.g. Hand-knit woolen cardigan" className="form-input mt-2" />{errors.name ? <FieldError>{errors.name.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">URL slug <span className="font-normal normal-case tracking-normal">(auto-generated)</span></span><input {...register('slug')} placeholder="hand-knit-woolen-cardigan" className="form-input mt-2 bg-surface-container-low" />{errors.slug ? <FieldError>{errors.slug.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">Short description</span><textarea {...register('short_description')} rows={3} placeholder="A brief story for product cards..." className="form-input mt-2 resize-y rounded-2xl" /></label><label className="block"><span className="label-caps text-on-surface-variant">Full description</span><textarea {...register('description')} rows={8} placeholder="Detailed product story, materials, and care instructions..." className="form-input mt-2 resize-y rounded-2xl bg-surface" />{errors.description ? <FieldError>{errors.description.message}</FieldError> : null}</label><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="label-caps text-on-surface-variant">Base price (₹)</span><input {...register('base_price')} type="number" min="0" step="0.01" placeholder="e.g. 2500" className="form-input mt-2" />{errors.base_price ? <FieldError>{errors.base_price.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">Discounted price (₹, optional)</span><input {...register('discount_price')} type="number" min="0" step="0.01" placeholder="e.g. 1999" className="form-input mt-2" />{errors.discount_price ? <FieldError>{errors.discount_price.message}</FieldError> : null}</label></div><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="label-caps text-on-surface-variant">Category</span><select {...register('category_id')} className="form-input mt-2"><option value="">Select a category…</option>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.category_id ? <FieldError>{errors.category_id.message}</FieldError> : null}</label><label className="block"><span className="label-caps text-on-surface-variant">Lead time (days)</span><input {...register('lead_time_days')} type="number" min="1" className="form-input mt-2" />{errors.lead_time_days ? <FieldError>{errors.lead_time_days.message}</FieldError> : null}</label></div><fieldset className="grid gap-3 rounded-2xl border border-admin-border p-4 sm:grid-cols-2"><legend className="label-caps px-2 text-on-surface-variant">Visibility</legend><label className="flex items-center justify-between gap-3 text-sm"><span>Available to order</span><input {...register('is_available')} type="checkbox" defaultChecked className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label><label className="flex items-center justify-between gap-3 text-sm"><span>Active on storefront</span><input {...register('is_active')} type="checkbox" defaultChecked className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label><label className="flex items-center justify-between gap-3 text-sm"><span>Featured</span><input {...register('is_featured')} type="checkbox" className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label><label className="flex items-center justify-between gap-3 text-sm"><span>Bestseller</span><input {...register('is_bestseller')} type="checkbox" className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label></fieldset></div><button type="submit" disabled={isSubmitting} className="focus-ring mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{isSubmitting ? 'Saving...' : 'Save and add images'}</button></form>
}

function FieldError({ children }: { children?: React.ReactNode }) { return <span className="mt-1 block text-xs text-error">{children}</span> }

function MediaPanel({ productId }: { productId: string }) {
  const isNew = productId === 'new'
  const store = useProductFormStore()
  const [items, setItems] = useState<Array<{ url: string; path: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pendingNames, setPendingNames] = useState<string[]>([])

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || isNew) return
    const fileArray = Array.from(files)
    setUploading(true); setError(''); setProgress(0); setPendingNames(fileArray.map(f=>f.name))
    try {
      for (let idx = 0; idx < fileArray.length; idx++) {
        const file = fileArray[idx]
        // client-side guard — mirrors server limits for instant feedback
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error(file.name + ': Only JPG/PNG/WEBP allowed')
        if (file.size > 5*1024*1024) throw new Error(file.name + ': exceeds 5MB')
        const form = new FormData()
        form.set('file', file)
        form.set('folder', 'products')
        form.set('alt', file.name.replace(/\.[^.]+$/, ''))
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || `Upload failed for ${file.name}`)
        // optimistic UI — show immediately, reconcile with DB on attach
        setItems((current) => [...current, { url: body.url, path: body.path }])
        setProgress(Math.round(((idx+1)/fileArray.length)*100))
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
    } finally {
      setUploading(false); setPendingNames([]); setTimeout(()=>setProgress(0), 800)
    }
  }

  const attachImages = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/products/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, images: items.map((item, index) => ({ url: item.url, display_order: index + 1, is_primary: index === 0 })) }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not attach images')
      setDone(true)
      // Sync attached images to preview store
      const attached = items.map((item, index) => ({
        id: `temp-${index}`,
        product_id: productId,
        url: item.url,
        alt_text: null,
        display_order: index + 1,
        is_primary: index === 0,
        created_at: new Date().toISOString(),
      }))
      store.setField('images', attached)
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : 'Could not attach images')
    } finally {
      setSaving(false)
    }
  }

  if (isNew) {
    return <section className="space-y-6"><div className="rounded-3xl border border-admin-border border-t-4 border-t-secondary bg-surface p-5 admin-shadow sm:p-8"><p className="label-caps text-secondary">Step order matters</p><h3 className="mt-2 font-serif text-3xl">Images come next</h3><p className="mt-3 max-w-lg text-sm leading-relaxed text-on-surface-variant">Save the basic info first — once the piece exists in the catalog you can upload its photos here and they will show up on the storefront instantly.</p></div></section>
  }

  return <section className="space-y-6"><div className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-8"><div className="flex items-center justify-between"><div><p className="label-caps text-primary">Product storytelling</p><h3 className="mt-2 font-serif text-3xl">Product images</h3></div><ImagePlus className="h-6 w-6 text-primary" /></div><label onDragOver={(e)=>{e.preventDefault(); setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={(e)=>{e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files as unknown as FileList)}} className={`mt-7 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-5 text-center transition ${dragOver ? 'border-primary bg-background-soft-pink' : 'border-primary-fixed-dim bg-background-soft-pink/40 hover:bg-background-soft-pink'}`}><span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-primary shadow-sm"><Upload className={`h-6 w-6 ${uploading ? 'animate-pulse' : ''}`} /></span><span className="mt-4 font-serif text-2xl">{uploading ? `Uploading ${progress}%...` : dragOver ? 'Drop to upload to product-images' : 'Drop product images here'}</span><span className="mt-2 text-sm text-on-surface-variant">Direct to Supabase Storage <span className="font-mono text-xs">product-images</span> · PNG, JPG or WEBP up to 5MB · first image becomes primary</span><span className="mt-5 rounded-full border-2 border-primary px-5 py-2.5 text-sm font-semibold text-primary">Browse files</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={uploading} onChange={(event) => { uploadFiles(event.target.files); (event.target as HTMLInputElement).value = '' }} /></label>
        {uploading ? <div className="mt-4"><div className="flex justify-between text-xs text-on-surface-variant"><span>{pendingNames[0] ?? 'Uploading…'}</span><span>{progress}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary-container transition-all" style={{width: `${progress}%`}} /></div><div className="mt-3 grid grid-cols-3 gap-2">{pendingNames.map(name=><div key={name} className="h-20 animate-pulse rounded-2xl bg-surface-container-low" />)}</div></div> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-error">{error}</p> : null}{done ? <p role="status" className="mt-4 rounded-xl bg-[#effcf1] px-4 py-3 text-sm text-success">Images attached — they are live on the storefront now.</p> : null}</div>{items.length ? <div className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow sm:p-8"><div className="flex items-center justify-between"><h3 className="font-serif text-3xl">Uploaded media</h3><span className="rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface-variant">{items.length} items</span></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map((item, index) => <figure key={item.path} className="overflow-hidden rounded-2xl border border-admin-border"><img src={item.url} alt={`Uploaded product view ${index + 1}`} className="aspect-square w-full object-cover" /><figcaption className="px-3 py-2 text-xs text-on-surface-variant">{index === 0 ? 'Primary image' : `View ${index + 1}`}</figcaption></figure>)}</div><button type="button" onClick={attachImages} disabled={saving} className="focus-ring mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Attaching...' : done ? 'Attached ✓' : 'Attach images to product'}</button></div> : null}</section>
}

