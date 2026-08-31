import { LegalPage } from '@/components/storefront/LegalPage'

export const metadata = { title: 'Privacy Policy — Art.isticcore' }

export default function PrivacyRoute() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="August 2026"
      intro="Your privacy matters to us. This policy explains what we collect, why, and how we keep it safe."
      sections={[
        {
          heading: 'What we collect',
          body: [
            'Account details: your name, email address, and phone number when you register or place an order.',
            'Delivery details: the address you save so we can ship your handmade pieces.',
            'Order details: items purchased, payment status, and communication about your order.',
            'Usage data: basic, anonymous analytics about how the store is used, so we can improve it.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To craft, pack, and deliver your orders — and to keep you updated about them.',
            'To provide support over WhatsApp, email, or phone when you reach out.',
            'We never sell your personal data to anyone, ever.',
          ],
        },
        {
          heading: 'Payments',
          body: [
            'Payments are processed securely by Razorpay. Your card or UPI details go directly to Razorpay and are never stored on our servers.',
            'Cash-handling is not applicable — all payments are completed online at checkout.',
          ],
        },
        {
          heading: 'Data security & your rights',
          body: [
            'Data is stored with Supabase (PostgreSQL) using industry-standard encryption and row-level security.',
            'You may request a copy of your data, corrections, or deletion of your account at any time by writing to hello@artisticcore.in.',
          ],
        },
      ]}
    />
  )
}
