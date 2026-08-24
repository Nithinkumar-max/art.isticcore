import { CatalogPage } from '@/components/storefront/CatalogPage'

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams
  const query = Array.isArray(params.q) ? params.q[0] : params.q
  return <CatalogPage initialSearch={query || ''} />
}
