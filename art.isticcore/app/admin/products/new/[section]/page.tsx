import { ProductEditorPage, type ProductEditorSection } from '@/components/admin/ProductPages'

export default async function AdminNewProductSectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  const valid: ProductEditorSection[] = ['basic', 'media']
  return <ProductEditorPage section={valid.includes(section as ProductEditorSection) ? section as ProductEditorSection : 'basic'} />
}
