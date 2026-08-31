import { LegalPage } from '@/components/storefront/LegalPage'

export const metadata = { title: 'Terms & Conditions — Art.isticcore' }

export default function TermsRoute() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="August 2026"
      intro="The simple rules that keep our little studio running smoothly for everyone."
      sections={[
        {
          heading: 'Handmade means handmade',
          body: [
            'Every piece is crafted by hand after you order. Small variations in size, colour, and texture are natural and are not defects.',
            'Colours may look slightly different on screen depending on your display.',
          ],
        },
        {
          heading: 'Made-to-order & lead time',
          body: [
            'Each product page shows its crafting lead time. Your piece enters production once payment is confirmed.',
            'Large or custom commissions may take longer; we will always communicate timelines upfront.',
          ],
        },
        {
          heading: 'Orders & pricing',
          body: [
            'All prices are in Indian Rupees (INR) and include applicable taxes where mentioned.',
            'We reserve the right to cancel an order in rare cases (e.g., stock or pricing errors) with a full refund.',
            'An order is confirmed only after successful payment through our payment gateway.',
          ],
        },
        {
          heading: 'Acceptable use',
          body: [
            'Please do not misuse the site — no scraping, fraud, or interference with its operation.',
            'All product photos, designs, and content belong to Art.isticcore and may not be reproduced without permission.',
          ],
        },
        {
          heading: 'Governing law',
          body: ['These terms are governed by the laws of India, with jurisdiction in Bangalore, Karnataka.'],
        },
      ]}
    />
  )
}
