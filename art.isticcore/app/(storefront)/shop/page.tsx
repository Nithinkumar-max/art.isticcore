import { CatalogPage } from '@/components/storefront/CatalogPage'

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; category?: string | string[] }> }) {
  const params = await searchParams
  const query = Array.isArray(params.q) ? params.q[0] : params.q
  const category = Array.isArray(params.category) ? params.category[0] : params.category
  return <CatalogPage initialSearch={query || ''} collectionSlug={category} collectionTitle={category ? category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : undefined} />
}
