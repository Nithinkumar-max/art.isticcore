import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata: Metadata = {
  title: {
    default: 'Art.isticcore — Handcrafted Crochet, Made to Order',
    template: '%s | Art.isticcore',
  },
  description:
    'Artisanal crochet pieces crafted to order with warmth, patience, and timeless texture. Thoughtfully made in India and delivered across the country.',
  keywords: ['Art.isticcore', 'crochet', 'handmade', 'amigurumi', 'made to order', 'India'],
  openGraph: {
    type: 'website',
    siteName: 'Art.isticcore',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
