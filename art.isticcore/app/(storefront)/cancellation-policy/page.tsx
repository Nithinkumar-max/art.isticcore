import { LegalPage } from '@/components/storefront/LegalPage'

export const metadata = { title: 'Cancellation Policy — Art.isticcore' }

export default function CancellationRoute() {
  return (
    <LegalPage
      title="Cancellation Policy"
      updated="August 2026"
      intro="Because every piece is made just for you, cancellations depend on how far along your order is."
      sections={[
        {
          heading: 'Before production begins',
          body: [
            'You can cancel within 24 hours of placing your order for a full refund — no questions asked.',
            'Write to hello@artisticcore.in or message us on WhatsApp with your order number.',
          ],
        },
        {
          heading: 'After production begins',
          body: [
            'Once crafting has started, orders cannot be cancelled, as materials are already purchased and hours of handwork may be invested.',
            'Custom and personalised commissions cannot be cancelled once the design is confirmed with you.',
          ],
        },
        {
          heading: 'Refund timelines',
          body: [
            'Approved refunds are issued to the original payment method within 5–7 business days.',
            'You will receive an email confirmation as soon as your refund is initiated.',
          ],
        },
      ]}
    />
  )
}
