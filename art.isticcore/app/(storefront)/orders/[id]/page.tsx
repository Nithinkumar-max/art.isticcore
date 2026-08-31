import { TrackingPage } from '@/components/storefront/OrderPages'

export default async function OrderDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TrackingPage orderId={id} />
}
