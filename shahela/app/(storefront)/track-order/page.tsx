import { TrackingPage } from '@/components/storefront/OrderPages'

export default async function TrackOrderRoute({ searchParams }: { searchParams: Promise<{ order?: string | string[] }> }) {
  const params = await searchParams
  const order = Array.isArray(params.order) ? params.order[0] : params.order
  return <TrackingPage orderNumber={order} />
}
