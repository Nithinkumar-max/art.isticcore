import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/contact'

export interface LegalSection {
  heading: string
  body: string[]
}

export function LegalPage({ title, updated, intro, sections }: {
  title: string
  updated?: string
  intro?: string
  sections: LegalSection[]
}) {
  return (
    <main className="pt-20">
      <section className="bg-background-warm px-4 py-14 text-center sm:px-6 md:py-16">
        <div className="page-track">
          <p className="label-caps text-on-surface-variant"><Link href="/" className="hover:text-primary">Home</Link><span className="mx-2">/</span><span className="text-primary">{title}</span></p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-on-surface md:text-5xl">{title}</h1>
          {updated ? <p className="mt-3 text-xs uppercase tracking-wider text-on-surface-variant">Last updated: {updated}</p> : null}
          {intro ? <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant">{intro}</p> : null}
        </div>
      </section>
      <section className="page-track max-w-3xl pb-20 pt-10 md:pb-24">
        <div className="space-y-8">
          {sections.map((section) => (
            <article key={section.heading} className="surface-card p-6 sm:p-8">
              <h2 className="font-serif text-2xl font-semibold text-on-surface">{section.heading}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph, index) => <p key={index} className="text-sm leading-relaxed text-on-surface-variant">{paragraph}</p>)}
              </div>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-on-surface-variant">Questions? Write to <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a></p>
      </section>
    </main>
  )
}
