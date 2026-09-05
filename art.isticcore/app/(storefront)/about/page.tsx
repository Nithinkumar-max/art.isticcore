import Link from 'next/link'
import { Heart, Leaf, Scissors, Users } from 'lucide-react'

export const metadata = { title: 'About Us — Art.isticcore' }

const values = [
  { icon: Heart, title: 'Made with love', body: 'Every piece is crocheted by hand, one stitch at a time, by artisans who genuinely care about the craft.' },
  { icon: Leaf, title: 'Slow fashion', body: 'We believe in quality over quantity. No mass production, no factory lines — just unhurried, intentional making.' },
  { icon: Scissors, title: 'Traditional craft', body: 'We keep the age-old art of crochet alive, passing techniques from experienced hands to new makers.' },
  { icon: Users, title: 'Artisan-first', body: 'Our makers set fair pace and are paid fairly for their skill. When they thrive, the craft thrives.' },
]

export default function AboutRoute() {
  return (
    <main className="pt-20">
      <section className="bg-background-warm px-4 py-14 text-center sm:px-6 md:py-16">
        <div className="page-track">
          <p className="label-caps text-on-surface-variant"><Link href="/" className="hover:text-primary">Home</Link><span className="mx-2">/</span><span className="text-primary">About us</span></p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-on-surface md:text-5xl">The story behind every stitch</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant">Art.isticcore is a small crochet studio crafting handmade garments, accessories, and home décor — made to order, made to last, and made with a whole lot of heart.</p>
        </div>
      </section>

      <section className="page-track max-w-3xl pb-12 pt-10">
        <article className="surface-card p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-semibold text-on-surface">How it started</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-on-surface-variant">
            <p>What began as a hobby — a hook, a ball of yarn, and quiet evenings — grew into a studio when friends and family kept asking for &ldquo;one more of those.&rdquo; Today, Art.isticcore brings together passionate artisans across India who share one belief: things made by hand carry warmth that machines can never replicate.</p>
            <p>We craft every order only after it is placed. That means your cardigan, cushion, or gift starts its journey specifically for you — choosing the yarn, matching the colours, and working every stitch with patience.</p>
          </div>
        </article>
      </section>

      <section className="page-track max-w-4xl pb-14">
        <h2 className="text-center font-serif text-3xl font-semibold text-on-surface">What we stand for</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface-card flex items-start gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary-container bg-background-soft-pink text-primary"><Icon className="h-5 w-5" /></span>
              <div>
                <h3 className="font-serif text-xl text-on-surface">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="page-track max-w-3xl pb-20 text-center">
        <div className="surface-card p-8">
          <h2 className="font-serif text-2xl font-semibold text-on-surface">Want something made just for you?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant">From bespoke garments to personalised home décor, we love bringing unique visions to life. Tell us what you dream of, and we&rsquo;ll craft it by hand.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/custom-order" className="focus-ring rounded-full bg-primary-container px-6 py-3 text-sm font-semibold text-on-primary-container hover:bg-primary-dark hover:text-white">Start a custom order</Link>
            <Link href="/shop" className="focus-ring rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-background-soft-pink">Browse the shop</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
