import { LegalPage } from '@/components/storefront/LegalPage'

export const metadata = { title: 'Return & Refund Policy — Art.isticcore' }

export default function ReturnPolicyRoute() {
  return (
    <LegalPage
      title="Return & Refund Policy"
      updated="August 2026"
      intro="We want you to love your handmade piece. Here is exactly where you stand."
      sections={[
        {
          heading: 'Damaged or wrong item?',
          body: [
            'If your piece arrives damaged or isn’t what you ordered, contact us within 48 hours of delivery with photos of the item and packaging.',
            'We will repair, replace, or fully refund the item — including any shipping cost you paid.',
          ],
        },
        {
          heading: 'Returns for other reasons',
          body: [
            'Because pieces are made to order, we do not accept returns for change-of-mind purchases on standard items that arrive in perfect condition.',
            'Custom commissions and personalised pieces are final sale once production starts.',
          ],
        },
        {
          heading: 'How refunds work',
          body: [
            'Approved refunds go back to your original payment method within 5–7 business days.',
            'For UPI payments, the amount returns to the same UPI ID used at checkout.',
          ],
        },
        {
          heading: 'Non-returnable situations',
          body: [
            'Minor variations natural to handmade work (stitch tension, slight colour shade).',
            'Damage caused by improper use or washing contrary to the care guide.',
          ],
        },
      ]}
    />
  )
}
