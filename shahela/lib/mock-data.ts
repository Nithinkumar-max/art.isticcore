import type { ProductWithRelations } from '@/types'

export interface MockVariant {
  id: string
  name: string
  price: number
  compareAtPrice?: number
  leadTimeDays?: number
}

export interface MockProduct {
  id: string
  name: string
  slug: string
  category: string
  categorySlug: string
  description: string
  shortDescription: string
  price: number
  compareAtPrice?: number
  rating?: number
  reviewCount?: number
  badge?: string
  leadTimeDays: number
  imageUrl: string
  gallery: string[]
  variants: MockVariant[]
  isActive: boolean
  isBestseller: boolean
}

const images = {
  hero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1pCzejkLhM39B8ZKwP7w_OxCeI6EK1d_632NN2VsBK-BcBd-rLk3LT-PtDOmtxiZ6re2yzgOxiKzTKffGc0-T6UJPc42rR5qL8YJXO0_am5ZJXLcfIzT-oqmRBsoVceuZSGud9EmBg3G-muppQj3n-H7-lVeEtiBO-GIrNkHopQFzZqfb2cd8hn9ya590NkI_G7ZLvb7xkN2eZQTlg1pNYouL9IO6OGAxGB0Z5HyFbqK9iMvXHt45QA',
  heroMobile: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCzjnkXgIWuLfWYFdSfMSPa0JWOwN2CydFETlgmvNhvrK8Uftp9zDtj3XhE26FEw9t2i218mcKWkwDD3oc9O_3fCo4UypPFSuTxFbsgaVi23VIWJJVvKb1KQ7GwqUOpqTFqAN_2ChhgP8CQPQUmQWnfYcq2-t9K945JWiPO8eqpA28Kmk6VDzOadGSj82Q6V6TNmjJVUNPo6NU9rDh2aPPZeN3cywT4M9fZq1dYBv3uXoxT3bRtzZGHA',
  sweater: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr9YsqPsamrihCG2Xr4MkAfoeNe2E3d-hzxsXOH7LNil1rZYHPFttVQJcpoz9XOBBM61OSDEodQua9skxhJ9FNDA_ZeOvXWY6FHfotdi1aHi12W4RD1UbjADQO5vBdrD4wGhHOnM-6M7CjfHeOpP5nspQGo7gXpczV7UFBrgZJ1nl31UmMWwI5tZK57tVSxlQsQzK-76o5xe3PCIKeeoU7KNY8InzUDaCDbAsAApKWm5k_CnaRCADkWw',
  throw: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkhb-B_Bf4RaymTmV_tfP9OY0Nl-tlTrmXkgvh7GLTyl3v73KZkMvT_0siXrAhKSUlShuzUPWNhPCX6Q9NsgEzYru-7poIuhVtcL9tWZJ4qdfApoh4meKdkMiGRXfJg8Xq4P8MZuHVrQXS-rUStutm-DuYuwgQrs2W4JmYGCBn_jAGUA1Id0gQ1hbYgCRcBwqqUGybH87RxXUIntc5pN_L6TQwm-BvMJnthSronS_9IFcPuj83oMY-2Q',
  tote: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSBRu3HM_MzghSREwzpiRpwUiupbg3NxHjlLJXXPvFhF4B2jGBm-9ER7ByTWffSEl6drOkaO9yWKP0r0NyyhAY8E-3V9KEeLtRUq0ZQUYYfJ1gcl0r5-J5qViFnVzIJEvTq2pvwxIG6xcrwTpv4jQ_Fcsf5F_mz7yyaGvIG3bvYP_jOL9LAmFgk5UsSjbNh7cOcPfxZwCNzCoIEfiyK_0MKr8ml6CmjpVfd_eLluB0nz4T8J7P2-GG3Q',
  lace: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmV54LUv9hc_R3XfJN2s5OUEHw_TmwICyv5ekGU5AsWvs1UQo0EjfIdGb2w6g7EGuLQ3WLqlUpyokt1ZnTclrWtVBbvARUPwKCpynplfAd-5j-svq_Vu6mwtmResFq4IMuvN9cCqcNBMGVOFrK8TjKwcKMwLoGcaI-agZmAjN0LGSomlqCOTn4gJLFMYXqTq5aKIpiTDH52_T7OsLzMbufN0racn2o2VKP4_xZ5xKFGzMcgsJFLjY3Yg',
  sunflower: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgbW28ZPHWaWFCt3brWfyLTtBdn92LSCj8GIPK3UqcZ3Fi7lymSF_oOt0kg8k610sezAPHFhdEeEZhfCc6zYCEGM9XGUTyH0B15NimMU5hTMfdM6TF4Jd7a1UR2j6L_dISSmkSYp6SUu4vWqU0C0w5p4AKg6DO5uvwAfsLomRzyBBAr9V8lAMEtPA3P_GjyuK2KXIO-2lQjydJ3uH0CE9Q8tfE1x_dQGn1D5MKUOf0wRb5XFz8P_6phg',
  roses: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAn0zqlFyhf0yTe0mc_QtubR1nILpzXdZA9uzeb-XxYIhro2dfBH0N2gamPwem72BPnzqYfugiH1WHqelrTFYuUH1JgkaNrcaBuQObgEccUWG0cxGKOOHqdD6_71LzRA6CEl01tJ_6KW1uMpc3V77-rYDQ-oaV9rbA7IplsNE7_PXpzjbTnMBtXAlWdDU2JRT2NHGae6Li6W-asVg2E0dxEh6csE1XeuopkC5II_c77Wt_kAt_chugaFQ',
  bouquet: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtqqKJzzHLLSucGga2xH_VLLsbWhWkfqDQYC5GIk7H5oRMCepi6RYLXkuoMy_53O9tGjwEVjYQDAOWbaVAk-yUHAp9yprzm7OLWhxWvaSp8mUc-xJOE8YVI2SvKLSH_7bfa3_0y5nAlEKntsIX4zzNDDNuMNMaea6UvqyxEE2FcDPMRNrO93CY0rII9z5ZkZE-rC1ANbRfGdZ10gE37IT5rkEbYpxL7LGSxPlHDUGqcPg1TYDCvwlmsg',
  bouquetAlt: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMRZYmcH2CE0Vm0nr3klZnLRh_p-C_no1I0RKab41XI0qeAbFoZ-U5bIVq-bqd6FBX2Ls-jUZha0MtLVMzmYW_PYf_GKZP9h0wK6HkzgbqMhxozeyIRdxuhHF86pSnmg-G1SOlOgVk6EMxoJWadFRONzLAT4onVcl2gksz53kvXAz5M9BQ7-KXoyecUpXd7zpD1geT4_yo106B0rn0CQjVNnax920n-7wTe6_-phWiXaMOEhz_9rZQlg',
  bouquetDetail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTjGcD2j5ZzeVBxrBz7qi86N7A7FBoyi2GyLcSjXcWrCFiM83VM6obTHxQSGFeuRqQfkfIVmW4x0zzVLVIkrcZHNztMWZB3P7qp5OC0ejuNeTKyGQ8XMufMCOOkXoxyNTxD-u6o3ZNhuwLLodC0-eTR9490J9E0yNgqiTuKVR7gbN-LW3eM0AWTQbRberAU2U0l6IV6DfZ-3H3j_lQwSpHMLWWvn9ooAiLYzGYTYbFHN64-cVWpos7zg',
  bouquetClose: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANcW1irqxWqJYR-5RL1uQ9EVb_Lz285PTn6MqKn05h2pd9VhsCllwwOSSqevnJqpQ7vZVwtFNC4Qn1ffhGFbPt5BotpWjiTFLNs46dApZv0FzW-hKMPBo3vWotgVts3UU-2oXsMUDgwHaH4oJcLmoF44Nh-geMnrw2L4J7GGWPeidJcOXHAfdv84msr5NhQl87EYf6K62ixSj48duMiLl1phZk5VeW1HeBaQV3ZeqRHRbIZ2FJ4u89pg',
  texture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr9YsqPsamrihCG2Xr4MkAfoeNe2E3d-hzxsXOH7LNil1rZYHPFttVQJcpoz9XOBBM61OSDEodQua9skxhJ9FNDA_ZeOvXWY6FHfotdi1aHi12W4RD1UbjADQO5vBdrD4wGhHOnM-6M7CjfHeOpP5nspQGo7gXpczV7UFBrgZJ1nl31UmMWwI5tZK57tVSxlQsQzK-76o5xe3PCIKeeoU7KNY8InzUDaCDbAsAApKWm5k_CnaRCADkWw',
}

export const ARTISTICCORE_IMAGES = images

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'mock-sunflower-bouquet',
    name: 'Giant Sunflower Bouquet',
    slug: 'giant-sunflower-bouquet',
    category: 'Floral Collections',
    categorySlug: 'sunflower',
    description: 'Bring a touch of eternal sunshine into your space with our giant hand-crocheted sunflower bouquet. Each petal is shaped by hand using premium, eco-friendly cotton yarn.',
    shortDescription: 'A bright, everlasting bouquet made slowly by hand.',
    price: 1800,
    compareAtPrice: 2400,
    rating: 4.8,
    reviewCount: 124,
    badge: 'Best Seller',
    leadTimeDays: 7,
    imageUrl: images.bouquet,
    gallery: [images.bouquet, images.bouquetAlt, images.bouquetDetail, images.bouquetClose],
    variants: [
      { id: 'standard', name: 'Standard (1 Stem)', price: 900, leadTimeDays: 5 },
      { id: 'medium', name: 'Medium (3 Stems)', price: 1800, compareAtPrice: 2400, leadTimeDays: 7 },
      { id: 'large', name: 'Large (5 Stems)', price: 2800, leadTimeDays: 10 },
    ],
    isActive: true,
    isBestseller: true,
  },
  {
    id: 'mock-sunflower-tote',
    name: 'Classic Sunflower Tote',
    slug: 'classic-sunflower-tote',
    category: 'Bags & Totes',
    categorySlug: 'bags',
    description: 'A practical, joyful tote with a hand-crocheted sunflower motif and sturdy cotton handles.',
    shortDescription: 'Everyday carry, with a little bit of sunshine.',
    price: 2100,
    rating: 4.9,
    reviewCount: 42,
    badge: 'Bestseller',
    leadTimeDays: 10,
    imageUrl: images.tote,
    gallery: [images.tote, images.bouquetAlt],
    variants: [],
    isActive: true,
    isBestseller: true,
  },
  {
    id: 'mock-oatmeal-sweater',
    name: 'Oatmeal Dream Sweater',
    slug: 'oatmeal-dream-sweater',
    category: 'Apparel',
    categorySlug: 'apparel',
    description: 'A soft, oversized knit-inspired sweater with a relaxed silhouette and tactile stitchwork.',
    shortDescription: 'The softest layer for slow mornings.',
    price: 3499,
    rating: 4.9,
    reviewCount: 28,
    leadTimeDays: 14,
    imageUrl: images.sweater,
    gallery: [images.sweater, images.texture],
    variants: [],
    isActive: true,
    isBestseller: false,
  },
  {
    id: 'mock-berry-throw',
    name: 'Berry Bliss Chunky Throw',
    slug: 'berry-bliss-chunky-throw',
    category: 'Blankets',
    categorySlug: 'blankets',
    description: 'A plush, berry-toned throw designed to turn a quiet corner into a warm retreat.',
    shortDescription: 'Plush texture for your coziest corner.',
    price: 4999,
    compareAtPrice: 5600,
    rating: 5,
    reviewCount: 42,
    badge: 'Bestseller',
    leadTimeDays: 15,
    imageUrl: images.throw,
    gallery: [images.throw, images.texture],
    variants: [],
    isActive: true,
    isBestseller: true,
  },
  {
    id: 'mock-rose-bouquet',
    name: 'Rose Bouquet',
    slug: 'rose-bouquet',
    category: 'Floral Collections',
    categorySlug: 'bouquets',
    description: 'Pastel crochet roses gathered in a timeless bouquet that never needs water.',
    shortDescription: 'An everlasting pastel bouquet.',
    price: 2400,
    rating: 5,
    reviewCount: 31,
    leadTimeDays: 8,
    imageUrl: images.roses,
    gallery: [images.roses, images.bouquet],
    variants: [],
    isActive: true,
    isBestseller: true,
  },
  {
    id: 'mock-market-tote',
    name: 'Market Day Tote Bag',
    slug: 'market-day-tote-bag',
    category: 'Bags & Totes',
    categorySlug: 'bags',
    description: 'An airy, natural cotton tote for market mornings, books, and everyday treasures.',
    shortDescription: 'Lightweight, roomy, and beautifully tactile.',
    price: 1599,
    rating: 4.8,
    reviewCount: 35,
    badge: 'Trending',
    leadTimeDays: 8,
    imageUrl: images.tote,
    gallery: [images.tote, images.texture],
    variants: [],
    isActive: true,
    isBestseller: false,
  },
  {
    id: 'mock-blush-lace',
    name: 'Blush Lace Camisole',
    slug: 'blush-lace-camisole',
    category: 'Summer Tops',
    categorySlug: 'summer-tops',
    description: 'A delicate lace camisole with airy openwork and a soft blush finish.',
    shortDescription: 'Delicate texture for sunlit days.',
    price: 2499,
    rating: 4.9,
    reviewCount: 19,
    badge: 'Popular',
    leadTimeDays: 10,
    imageUrl: images.lace,
    gallery: [images.lace, images.texture],
    variants: [],
    isActive: true,
    isBestseller: false,
  },
  {
    id: 'mock-sunflower-charm',
    name: 'Sunflower Cheer Pocket Charm',
    slug: 'sunflower-cheer-pocket-charm',
    category: 'Amigurumi & Charms',
    categorySlug: 'amigurumi',
    description: 'A tiny sunflower charm to clip onto a bag, keys, or a thoughtful gift.',
    shortDescription: 'A pocket-sized burst of handmade joy.',
    price: 799,
    compareAtPrice: 999,
    rating: 4.9,
    reviewCount: 64,
    badge: 'Bestseller',
    leadTimeDays: 5,
    imageUrl: images.sunflower,
    gallery: [images.sunflower, images.bouquetClose],
    variants: [],
    isActive: true,
    isBestseller: true,
  },
]

export const MOCK_ADDRESSES = [
  {
    id: 'mock-home',
    label: 'Home' as const,
    fullName: 'Riya Sharma',
    phone: '+91 98765 43210',
    line1: '14, Blossom Enclave, Phase 2',
    line2: '',
    city: 'Ludhiana',
    state: 'Punjab',
    pincode: '141001',
    isDefault: true,
  },
  {
    id: 'mock-work',
    label: 'Work' as const,
    fullName: 'Riya Sharma',
    phone: '+91 98765 43210',
    line1: 'Tech Park, Tower B, Floor 4',
    line2: '',
    city: 'Chandigarh',
    state: 'Punjab',
    pincode: '160019',
    isDefault: false,
  },
]

export const MOCK_ORDERS = [
  {
    id: 'mock-order-8924',
    orderNumber: 'KNT-8924',
    status: 'DELIVERED' as const,
    createdAt: '2024-10-12T10:42:00.000Z',
    total: 2499,
    estimatedDelivery: 'Delivered Oct 20',
    trackingNumber: 'KNT-1244',
    items: [{ name: 'Pastel Dream Tote', quantity: 1, price: 2499, imageUrl: images.tote }],
  },
  {
    id: 'mock-order-8910',
    orderNumber: 'KNT-8910',
    status: 'SHIPPED' as const,
    createdAt: '2024-10-18T10:42:00.000Z',
    total: 4200,
    estimatedDelivery: 'Expected Nov 2',
    trackingNumber: 'KNT-1290',
    items: [{ name: 'Autumn Whisper Cardigan', quantity: 1, price: 4200, imageUrl: images.sweater }],
  },
  {
    id: 'mock-order-9824',
    orderNumber: 'KNT-9824',
    status: 'IN_PRODUCTION' as const,
    createdAt: '2024-10-12T10:42:00.000Z',
    total: 190,
    estimatedDelivery: 'Oct 24 - Oct 28',
    trackingNumber: undefined,
    items: [
      { name: 'Chunky Knit Cardigan', quantity: 1, price: 125, imageUrl: images.sweater },
      { name: 'Summer Breeze Tote', quantity: 1, price: 65, imageUrl: images.tote },
    ],
  },
]

export const MOCK_CHECKOUT_ITEMS = [
  { ...MOCK_PRODUCTS[4], price: 1800, quantity: 1 },
  { ...MOCK_PRODUCTS[0], name: 'Daisy Bouquet', price: 1200, quantity: 1 },
  { ...MOCK_PRODUCTS[3], name: 'Chunky Knit Throw', price: 1860, quantity: 1 },
]

export interface AdminOrderMock {
  id: string
  orderNumber: string
  column: 'NEW' | 'IN_PRODUCTION' | 'READY_TO_SHIP' | 'WITH_COURIER' | 'DELIVERED'
  productName: string
  customerName: string
  price: number
  imageUrl?: string
  progress?: number
  progressLabel?: string
  note?: string
  paymentLabel?: string
  ageLabel?: string
  courier?: string
}

export const MOCK_ADMIN_ORDERS: AdminOrderMock[] = [
  {
    id: 'admin-0921',
    orderNumber: 'ORD-0921',
    column: 'NEW',
    productName: 'Handwoven Linen Tunic',
    customerName: 'Sarah Jenkins',
    price: 14500,
    imageUrl: images.texture,
    paymentLabel: 'COD',
    ageLabel: '2h ago',
  },
  {
    id: 'admin-0922',
    orderNumber: 'ORD-0922',
    column: 'NEW',
    productName: 'Sunflower Cheer Charm',
    customerName: 'Rahul Verma',
    price: 1200,
    imageUrl: images.sunflower,
    paymentLabel: 'Paid',
    ageLabel: '5h ago',
  },
  {
    id: 'admin-0899',
    orderNumber: 'ORD-0899',
    column: 'IN_PRODUCTION',
    productName: 'Merino Wool Cardigan',
    customerName: 'Michael T.',
    price: 8900,
    progress: 40,
    progressLabel: 'Day 4 of 10',
  },
  {
    id: 'admin-0875',
    orderNumber: 'ORD-0875',
    column: 'READY_TO_SHIP',
    productName: 'Silk Scarf - Botanical',
    customerName: 'Emma R.',
    price: 3200,
    note: 'Weight: 0.4 lbs | Small Box',
  },
  {
    id: 'admin-0811',
    orderNumber: 'ORD-0811',
    column: 'WITH_COURIER',
    productName: 'Classic Sunflower Tote',
    customerName: 'Ananya Sharma',
    price: 2100,
    courier: 'Delhivery',
  },
]

export const MOCK_ADMIN_PRODUCTS = [
  { id: 'mock-sunflower-bouquet', name: 'Giant Sunflower Bouquet', category: 'Botanicals', variants: 3, price: 1800, isActive: true, isBestseller: true, imageUrl: images.bouquet },
  { id: 'mock-amigurumi-bunny', name: 'Amigurumi Bunny', category: 'Toys & Amigurumi', variants: 1, price: 1200, compareAtPrice: 1500, isActive: true, isBestseller: false, imageUrl: images.roses },
  { id: 'mock-chunky-cardigan', name: 'Chunky Knit Cardigan', category: 'Apparel', variants: 2, price: 4200, isActive: false, isBestseller: false, imageUrl: images.texture },
  { id: 'mock-rose-bouquet', name: 'Rose Bouquet', category: 'Botanicals', variants: 2, price: 2400, isActive: true, isBestseller: true, imageUrl: images.roses },
]

export const MOCK_PINCODE_INTEREST = [
  { pincode: '560001', cityState: 'Bangalore, KA', searchCount: '245 searches', uniqueUsers: 112, lastSearched: '1 hour ago', status: 'Delivering', demand: '+15%' },
  { pincode: '700001', cityState: 'Kolkata, WB', searchCount: '189 searches', uniqueUsers: 94, lastSearched: '5 hours ago', status: 'Not Delivering', demand: 'HIGH DEMAND' },
  { pincode: '141001', cityState: 'Ludhiana, PB', searchCount: '164 searches', uniqueUsers: 78, lastSearched: 'Yesterday', status: 'Delivering', demand: '' },
]

export function mapProductToMock(product: ProductWithRelations): MockProduct {
  const firstImage = product.images?.[0]?.url || images.sweater
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category?.name || 'Handcrafted',
    categorySlug: product.category?.slug || 'handcrafted',
    description: product.description,
    shortDescription: product.short_description || 'A carefully made Knotella🎀 original.',
    price: product.discount_price ?? product.base_price,
    compareAtPrice: product.discount_price ? product.base_price : undefined,
    rating: 4.9,
    reviewCount: 15,
    badge: product.is_bestseller ? 'Bestseller' : product.is_featured ? 'Featured' : undefined,
    leadTimeDays: product.lead_time_days || 12,
    imageUrl: firstImage,
    gallery: product.images?.map((image) => image.url) || [firstImage],
    variants: product.variants?.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.discount_price ?? variant.price,
      compareAtPrice: variant.discount_price ? variant.price : undefined,
      leadTimeDays: variant.lead_time_days || product.lead_time_days,
    })) || [],
    isActive: product.is_active,
    isBestseller: product.is_bestseller,
  }
}
