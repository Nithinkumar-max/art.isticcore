import { notFound } from 'next/navigation'
import { ProductDetailPage } from '@/components/storefront/ProductDetailPage'
import { getProductBySlug } from '@/lib/services/products'
import { mapProductToCard } from '@/lib/view-models'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug).catch(() => null)
  if (!product) notFound()
  return <ProductDetailPage product={mapProductToCard(product)} />
}
