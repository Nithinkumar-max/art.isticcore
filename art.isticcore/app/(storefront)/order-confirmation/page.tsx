import { ConfirmationPage } from '@/components/storefront/OrderPages'

export default async function ConfirmationRoute({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const params = await searchParams
  return <ConfirmationPage orderId={params.order} />
}
