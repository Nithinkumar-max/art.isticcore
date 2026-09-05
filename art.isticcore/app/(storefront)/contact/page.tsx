import Link from 'next/link'
import { Clock, Mail, MapPin } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/contact'

export const metadata = { title: 'Contact Us — Art.isticcore' }

export default function ContactRoute() {
  return (
    <main className="pt-20">
      <section className="bg-background-warm px-4 py-14 text-center sm:px-6 md:py-16">
        <div className="page-track">
          <p className="label-caps text-on-surface-variant"><Link href="/" className="hover:text-primary">Home</Link><span className="mx-2">/</span><span className="text-primary">Contact</span></p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-on-surface md:text-5xl">We&rsquo;d love to hear from you</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant">Questions about an order, a custom commission, or anything else? Drop us a line — real humans read every message.</p>
        </div>
      </section>

      <section className="page-track max-w-3xl pb-20 pt-10 md:pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="surface-card flex flex-col items-center p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-container bg-background-soft-pink text-primary"><Mail className="h-5 w-5" /></span>
            <h2 className="mt-3 font-serif text-lg text-on-surface">Email us</h2>
            <a href={`mailto:${CONTACT_EMAIL}`} className="focus-ring mt-1 break-all text-sm font-medium text-primary underline underline-offset-2">{CONTACT_EMAIL}</a>
            <p className="mt-1.5 text-xs text-on-surface-variant">Best for order questions &amp; custom commissions</p>
          </div>
          <div className="surface-card flex flex-col items-center p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-container bg-background-soft-pink text-primary"><Clock className="h-5 w-5" /></span>
            <h2 className="mt-3 font-serif text-lg text-on-surface">Response time</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Usually within 24 hours</p>
            <p className="mt-1.5 text-xs text-on-surface-variant">Mon–Sat, 10am–6pm IST</p>
          </div>
          <div className="surface-card flex flex-col items-center p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-container bg-background-soft-pink text-primary"><MapPin className="h-5 w-5" /></span>
            <h2 className="mt-3 font-serif text-lg text-on-surface">Studio</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Crafted in Bangalore</p>
            <p className="mt-1.5 text-xs text-on-surface-variant">Delivered pan-India</p>
          </div>
        </div>

        <div className="surface-card mt-10 p-8 text-center">
          <h2 className="font-serif text-2xl font-semibold text-on-surface">Before you write</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">For order questions, including your order number helps us help you faster. You might also find your answer in the FAQ.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/faq" className="focus-ring rounded-full bg-primary-container px-6 py-3 text-sm font-semibold text-on-primary-container hover:bg-primary-dark hover:text-white">Browse FAQ</Link>
            <Link href="/track-order" className="focus-ring rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-background-soft-pink">Track my order</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
