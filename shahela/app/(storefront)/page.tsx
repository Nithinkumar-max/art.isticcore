import { HeroSection } from '@/components/home/HeroSection'
import { TrendingSection } from '@/components/home/TrendingSection'
import { BestsellersSection } from '@/components/home/BestsellersSection'
import { FeaturesSection } from '@/components/home/FeaturesSection'
import { getProducts } from '@/lib/services/products'
import { getMediaBySlot } from '@/lib/services/media'
import type { ProductWithRelations } from '@/types'

export const revalidate = 300

export default async function HomePage() {
  let initialProducts: ProductWithRelations[] = []
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    try {
      const response = await getProducts({ limit: 8, isBestseller: true })
      if (response.data.length) initialProducts = response.data
    } catch {
      initialProducts = []
    }
  }
  const [heroDesktop, heroMobile] = await Promise.all([
    getMediaBySlot('hero-desktop').catch(() => null),
    getMediaBySlot('hero-mobile').catch(() => null),
  ])

  return <main className="min-h-screen bg-surface text-on-surface pt-20"><HeroSection desktopUrl={heroDesktop?.url} mobileUrl={heroMobile?.url} /><TrendingSection /><BestsellersSection products={initialProducts} /><FeaturesSection /></main>
}
