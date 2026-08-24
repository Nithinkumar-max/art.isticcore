import { Sparkles, Scissors, Truck, ShieldCheck } from 'lucide-react'

export function FeaturesSection() {
  const features = [
    {
      icon: Sparkles,
      title: '100% Handcrafted',
      desc: 'Each piece is individually crocheted by artisan hands using premium cotton & plush yarns.',
    },
    {
      icon: Scissors,
      title: 'Custom Made to Order',
      desc: 'Tailored dimensions, personalized color palettes, and bespoke designs created for you.',
    },
    {
      icon: Truck,
      title: 'Pan-India Express Shipping',
      desc: 'Dispatched directly from our studio in Bangalore with full doorstep order tracking.',
    },
    {
      icon: ShieldCheck,
      title: 'Artisan Quality Guarantee',
      desc: 'Rigorous quality checks before every parcel is lovingly gift-wrapped and sent.',
    },
  ]

  return (
    <section id="story" className="py-14 md:py-20 bg-[#f6f3f2] border-t border-[#eae7e7]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#ac2a5d]">
            The Slow Fashion Promise
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1c1b1b] font-semibold mt-1">
            Woven with Care, Built to Last
          </h2>
          <p className="text-sm text-[#574146] mt-2">
            We celebrate deliberate creation over mass production. Every stitch reflects hours of skill, patience, and mindful craftsmanship.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={i}
                className="bg-white rounded-[24px] p-6 text-center soft-shadow border border-[#f0eded] flex flex-col items-center hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-[#fff0f5] text-[#ac2a5d] flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#1c1b1b] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#574146] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
