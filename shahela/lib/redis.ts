import { Redis } from '@upstash/redis'

// Upstash Redis REST client (edge-compatible, works on Vercel/Netlify)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// TTL constants (seconds)
export const TTL = {
  PRODUCTS_LIST: 3600,      // 1 hour
  PRODUCT_DETAIL: 1800,     // 30 minutes
  CATEGORIES: 86400,        // 24 hours
  SETTINGS: 86400,          // 24 hours
  PINCODE: 3600,            // 1 hour
  CART: 300,                // 5 minutes
} as const

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await redis.get<T>(key)
    } catch (err) {
      console.error('[Redis] get error:', err)
      return null
    }
  },

  async set(key: string, value: unknown, ttl: number = TTL.PRODUCT_DETAIL): Promise<void> {
    try {
      await redis.set(key, value, { ex: ttl })
    } catch (err) {
      console.error('[Redis] set error:', err)
    }
  },

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await redis.del(...keys)
    } catch (err) {
      console.error('[Redis] del error:', err)
    }
  },

  /** Invalidate all keys matching a prefix pattern */
  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length > 0) await redis.del(...keys)
    } catch (err) {
      console.error('[Redis] invalidatePrefix error:', err)
    }
  },

  // Typed key builders
  keys: {
    productsList: (page: number, filter?: string) =>
      `products:list:${page}:${filter ?? 'all'}`,
    productDetail: (slug: string) => `product:${slug}`,
    categories: () => 'categories:all',
    settings: () => 'settings:all',
    pincode: (code: string) => `pincode:${code}`,
  },
}
