'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Filter, Grid2X2, List, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { mapProductToCard, type ProductCardModel } from '@/lib/view-models'
import { useProducts } from '@/lib/hooks/useProducts'
import { ProductCard } from '@/components/storefront/StorefrontPrimitives'

interface CatalogPageProps {
  collectionSlug?: string
  collectionTitle?: string
  initialSearch?: string
}

interface FilterState {
  category: string
  maxPrice: string
  rating: string
  bestsellersOnly: boolean
}

const emptyFilters: FilterState = { category: 'all', maxPrice: 'all', rating: 'all', bestsellersOnly: false }

export function CatalogPage({ collectionSlug, collectionTitle, initialSearch = '' }: CatalogPageProps) {
  const [search, setSearch] = useState(initialSearch)
  const [sort, setSort] = useState('featured')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading } = useProducts({
    categorySlug: collectionSlug === 'sunflower' ? undefined : collectionSlug,
    limit: 48,
  })

  const baseProducts = useMemo<ProductCardModel[]>(() => {
    const all = (data?.data ?? []).map(mapProductToCard)
    if (!collectionSlug) return all
    if (collectionSlug === 'sunflower') return all.filter((product) => ['sunflower', 'bouquets'].includes(product.categorySlug))
    return all.filter((product) => product.categorySlug === collectionSlug)
  }, [data, collectionSlug])

  const products = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = baseProducts.filter((product) => {
      const matchesQuery = !query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query)
      const matchesCategory = filters.category === 'all' || product.categorySlug === filters.category
      const matchesPrice = filters.maxPrice === 'all' || product.price <= Number(filters.maxPrice)
      const matchesRating = filters.rating === 'all' || (product.rating ?? 0) >= Number(filters.rating)
      const matchesBestseller = !filters.bestsellersOnly || product.isBestseller
      return matchesQuery && matchesCategory && matchesPrice && matchesRating && matchesBestseller
    })
    return [...result].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price
      if (sort === 'price-high') return b.price - a.price
      if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      return Number(b.isBestseller) - Number(a.isBestseller)
    })
  }, [baseProducts, filters, search, sort])

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key !== 'category' ? value !== 'all' && value !== false : value !== 'all').length
  const title = collectionTitle || (collectionSlug ? 'Collection' : 'All Handmade Pieces')
  const subtitle = collectionSlug === 'sunflower' ? 'Brighten your space with an everlasting garden of carefully crocheted blooms.' : 'Thoughtful, small-batch crochet pieces made slowly for everyday warmth.'

  const updateFilters = (next: Partial<FilterState>) => setDraftFilters((current) => ({ ...current, ...next }))
  const applyFilters = () => { setFilters(draftFilters); setPage(1); setDrawerOpen(false) }
  const clearFilters = () => { setFilters(emptyFilters); setDraftFilters(emptyFilters); setPage(1) }

  return (
    <main className="pt-20">
      <section className="bg-background-warm px-4 py-14 text-center sm:px-6 md:py-20">
        <div className="page-track">
          <p className="label-caps text-on-surface-variant"><a href="/" className="hover:text-primary">Home</a><span className="mx-2">/</span><span className="text-primary">Collections</span></p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-on-surface md:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant">{subtitle}</p>
          <p className="label-caps mt-5 text-on-surface-variant">{products.length} pieces</p>
        </div>
      </section>

      <div className="sticky top-[72px] z-30 border-y border-surface-container-high bg-surface/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="page-track flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => { setDraftFilters(filters); setDrawerOpen(true) }} className="focus-ring flex min-h-10 items-center gap-2 rounded-full border border-border-muted bg-surface-container-lowest px-4 text-sm font-medium text-on-surface transition hover:border-primary hover:text-primary"><SlidersHorizontal className="h-4 w-4" />Filter{activeFilterCount ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">{activeFilterCount}</span> : null}</button>
          <div className="flex items-center gap-2 text-sm"><label htmlFor="catalog-sort" className="hidden text-on-surface-variant sm:inline">Sort by:</label><div className="relative"><select id="catalog-sort" value={sort} onChange={(event) => setSort(event.target.value)} className="focus-ring appearance-none rounded-full border border-border-muted bg-surface-container-lowest py-2 pl-4 pr-9 text-sm text-on-surface"><option value="featured">Featured</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="rating">Top Rated</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" /></div><div className="hidden items-center gap-1 border-l border-surface-dim pl-2 md:flex"><button type="button" onClick={() => setView('grid')} className={`focus-ring rounded-full p-2 ${view === 'grid' ? 'text-primary' : 'text-on-surface-variant'}`} aria-label="Grid view" aria-pressed={view === 'grid'}><Grid2X2 className="h-4 w-4" /></button><button type="button" onClick={() => setView('list')} className={`focus-ring rounded-full p-2 ${view === 'list' ? 'text-primary' : 'text-on-surface-variant'}`} aria-label="List view" aria-pressed={view === 'list'}><List className="h-4 w-4" /></button></div></div>
        </div>
      </div>

      <section className="page-track py-10 md:py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="label-caps text-primary">Artisan favorites</p><h2 className="mt-2 font-serif text-3xl font-semibold">Made for your slow days</h2></div><p className="text-sm text-on-surface-variant">Showing {products.length} of {baseProducts.length} pieces</p></div>
        {isLoading ? <div className={view === 'grid' ? 'grid grid-cols-2 gap-3.5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4' : 'grid grid-cols-1 gap-4 lg:grid-cols-2'}>{[0, 1, 2, 3, 4, 5, 6, 7].map((index) => <div key={index} className="surface-card aspect-[3/4] animate-pulse bg-surface-container-low" aria-hidden="true" />)}</div> : products.length ? <div className={view === 'grid' ? 'grid grid-cols-2 gap-3.5 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4' : 'grid grid-cols-1 gap-4 lg:grid-cols-2'}>{products.map((product) => <ProductCard key={product.id} product={product} compact={view === 'list'} />)}</div> : <div className="surface-card flex min-h-72 flex-col items-center justify-center px-6 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-background-soft-pink text-primary"><Search className="h-6 w-6" /></div><h2 className="mt-5 font-serif text-2xl">No pieces found</h2><p className="mt-2 max-w-sm text-sm text-on-surface-variant">Try a different search or clear your filters to browse the full Art.isticcore collection.</p><button type="button" onClick={() => { setSearch(''); clearFilters() }} className="focus-ring mt-5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-dark">Clear filters</button></div>}
        <div className="mt-12 flex items-center justify-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-border-muted text-on-surface-variant disabled:opacity-40" aria-label="Previous page">‹</button>{[1, 2, 3].map((number) => <button type="button" key={number} onClick={() => setPage(number)} className={`focus-ring flex h-10 w-10 items-center justify-center rounded-full text-sm ${page === number ? 'bg-primary-container font-bold text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>{number}</button>)}<button type="button" onClick={() => setPage((value) => Math.min(3, value + 1))} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-border-muted text-on-surface-variant" aria-label="Next page">›</button></div>
      </section>

      <AnimatePresence>
        {drawerOpen ? <div className="fixed inset-0 z-50"><motion.button type="button" aria-label="Close filters" className="absolute inset-0 bg-on-surface/35 backdrop-blur-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} /><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-surface px-6 py-5 shadow-2xl" aria-label="Filter products"><div className="flex items-center justify-between border-b border-surface-container-high pb-4"><div><p className="label-caps text-primary">Refine your browse</p><h2 className="mt-1 font-serif text-3xl">Filters</h2></div><button type="button" onClick={() => setDrawerOpen(false)} className="focus-ring rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close filters"><X className="h-5 w-5" /></button></div><div className="flex-1 space-y-7 overflow-y-auto py-6"><label className="block"><span className="label-caps text-on-surface-variant">Search</span><div className="relative mt-2"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pieces..." className="focus-ring w-full rounded-full border border-outline-variant bg-surface-container-low px-11 py-3 text-sm" /></div></label><fieldset><legend className="label-caps text-on-surface-variant">Category</legend><div className="mt-3 grid grid-cols-2 gap-2">{[['all', 'All pieces'], ['sunflower', 'Sunflower'], ['bouquets', 'Bouquets'], ['blankets', 'Blankets'], ['bags', 'Bags'], ['apparel', 'Apparel']].map(([value, label]) => <button type="button" key={value} onClick={() => updateFilters({ category: value })} className={`focus-ring rounded-full border px-3 py-2 text-xs ${draftFilters.category === value ? 'border-primary bg-background-soft-pink font-semibold text-primary' : 'border-border-muted text-on-surface-variant'}`}>{label}</button>)}</div></fieldset><label className="block"><span className="label-caps text-on-surface-variant">Price up to</span><select value={draftFilters.maxPrice} onChange={(event) => updateFilters({ maxPrice: event.target.value })} className="focus-ring mt-2 w-full rounded-full border border-outline-variant bg-surface-container-low px-4 py-3 text-sm"><option value="all">Any price</option><option value="1000">₹1,000</option><option value="2000">₹2,000</option><option value="3500">₹3,500</option><option value="5000">₹5,000</option></select></label><label className="block"><span className="label-caps text-on-surface-variant">Minimum rating</span><select value={draftFilters.rating} onChange={(event) => updateFilters({ rating: event.target.value })} className="focus-ring mt-2 w-full rounded-full border border-outline-variant bg-surface-container-low px-4 py-3 text-sm"><option value="all">Any rating</option><option value="4">4.0 and above</option><option value="4.5">4.5 and above</option><option value="5">5.0 only</option></select></label><label className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3 text-sm"><span>Show bestsellers only</span><input type="checkbox" checked={draftFilters.bestsellersOnly} onChange={(event) => updateFilters({ bestsellersOnly: event.target.checked })} className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary" /></label></div><div className="flex gap-3 border-t border-surface-container-high pt-4"><button type="button" onClick={clearFilters} className="focus-ring flex-1 rounded-full border-2 border-primary px-4 py-3 text-sm font-semibold text-primary hover:bg-background-soft-pink">Clear</button><button type="button" onClick={applyFilters} className="focus-ring flex-1 rounded-full bg-primary-container px-4 py-3 text-sm font-semibold text-white pink-glow">Apply filters</button></div></motion.aside></div> : null}
      </AnimatePresence>
    </main>
  )
}
