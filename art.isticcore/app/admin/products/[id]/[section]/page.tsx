import { ProductEditorPage, type ProductEditorSection } from '@/components/admin/ProductPages'

export default async function AdminProductSectionRoute({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params
  const valid: ProductEditorSection[] = ['basic', 'media']
  return <ProductEditorPage productId={id} section={valid.includes(section as ProductEditorSection) ? section as ProductEditorSection : 'basic'} />
}
