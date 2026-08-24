import { CatalogPage } from '@/components/storefront/CatalogPage'

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const title = slug === 'sunflower' ? 'Sunflower Collection' : `${slug.replaceAll('-', ' ')} collection`
  return <CatalogPage collectionSlug={slug} collectionTitle={title} />
}
