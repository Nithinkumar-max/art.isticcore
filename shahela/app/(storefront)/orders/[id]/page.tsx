import { TrackingPage } from '@/components/storefront/OrderPages'

export default async function OrderDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderNumber = id.startsWith('mock-order') ? 'KNT-9824' : id
  return <TrackingPage orderNumber={orderNumber} />
}
