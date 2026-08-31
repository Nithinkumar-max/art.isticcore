import { ProductEditorPage } from '@/components/admin/ProductPages'

export default async function AdminProductRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductEditorPage productId={id} />
}
