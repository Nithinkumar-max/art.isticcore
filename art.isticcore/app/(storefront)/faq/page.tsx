import Link from 'next/link'

export const metadata = { title: 'FAQ — Art.isticcore' }

interface FaqGroup {
  heading: string
  items: { question: string; answer: string }[]
}

const faqGroups: FaqGroup[] = [
  {
    heading: 'Orders & crafting',
    items: [
      { question: 'Why does my order take 12 days to craft?', answer: 'Every piece is made by hand only after you place your order. We don\'t hold stock — your item is started fresh, specifically for you. 12 days is the standard crafting lead time; large or custom commissions may take longer, and we always communicate timelines upfront.' },
      { question: 'Can I rush my order?', answer: 'Sometimes, yes — it depends on our artisans\' queue. Reply to your order confirmation email or write to artisticcore@gmail.com with your order number and needed-by date, and we\'ll do our best.' },
      { question: 'Can I customise colours or sizes?', answer: 'Absolutely — that\'s the joy of handmade. Use our custom order page to describe exactly what you want, and we\'ll craft it to your specifications.' },
    ],
  },
  {
    heading: 'Payments & pricing',
    items: [
      { question: 'What payment methods do you accept?', answer: 'We accept UPI and all major payment methods through our secure Razorpay checkout. Your payment details are processed by the gateway — we never see or store your card information.' },
      { question: 'Are prices final, or are there hidden charges?', answer: 'Prices shown on product pages are final. Any applicable taxes are included, and shipping within India is free on all orders.' },
      { question: 'When is my order confirmed?', answer: 'Your order is confirmed once payment succeeds. You\'ll receive a confirmation email with your order number immediately after payment.' },
    ],
  },
  {
    heading: 'Shipping & delivery',
    items: [
      { question: 'Where do you deliver?', answer: 'We deliver pan-India. Enter your pincode at checkout — if we can\'t deliver to your pincode yet, you can join the waitlist and we\'ll notify you when service starts in your area.' },
      { question: 'How do I track my order?', answer: 'Use the Track Order page with your order number and the mobile number used at checkout. You\'ll also receive email updates as your order moves from crafting to shipped to delivered.' },
      { question: 'What if my order arrives damaged?', answer: 'Please write to artisticcore@gmail.com within 48 hours of delivery with photos of the item and packaging. We\'ll make it right — a repair, replacement, or refund depending on the situation. See our Return & Refund Policy for details.' },
    ],
  },
  {
    heading: 'Handmade & care',
    items: [
      { question: 'My piece looks slightly different from the photos. Is that normal?', answer: 'Yes — and it\'s a feature of handmade, not a defect. Small variations in size, colour, and texture are natural, and colours may appear slightly different depending on your screen.' },
      { question: 'How do I care for my crochet items?', answer: 'Hand-wash gently in cold water with mild detergent, reshape while damp, and dry flat in shade. Avoid wringing, machine-washing, or direct sunlight. With a little care, your piece will last for years.' },
    ],
  },
]

export default function FaqRoute() {
  return (
    <main className="pt-20">
      <section className="bg-background-warm px-4 py-14 text-center sm:px-6 md:py-16">
        <div className="page-track">
          <p className="label-caps text-on-surface-variant"><Link href="/" className="hover:text-primary">Home</Link><span className="mx-2">/</span><span className="text-primary">FAQ</span></p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-on-surface md:text-5xl">Frequently asked questions</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant">Everything about ordering, crafting times, shipping, and caring for your handmade pieces — answered.</p>
        </div>
      </section>

      <section className="page-track max-w-3xl space-y-10 pb-20 pt-10 md:pb-24">
        {faqGroups.map((group) => (
          <div key={group.heading}>
            <h2 className="label-caps text-primary">{group.heading}</h2>
            <div className="mt-4 space-y-4">
              {group.items.map((item) => (
                <details key={item.question} className="surface-card group p-5 sm:p-6">
                  <summary className="focus-ring cursor-pointer list-none font-serif text-lg font-semibold text-on-surface marker:hidden [&::-webkit-details-marker]:hidden">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-on-surface-variant">Still have a question? <Link href="/contact" className="text-primary underline">Contact us</Link> — we usually reply within a day.</p>
      </section>
    </main>
  )
}
