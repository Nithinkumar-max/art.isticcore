import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format price in Indian Rupees */
export function formatPrice(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

/** Calculate discount percentage */
export function discountPercent(base: number, discounted: number): number {
  return Math.round(((base - discounted) / base) * 100)
}

/** Generate a URL-safe slug from a string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Truncate text to a given length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

/** Format date for display */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/** Format date + time */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/** Add business days to a date */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0 && result.getDay() !== 6) added++
  }
  return result
}

/** Get estimated delivery date string */
export function estimatedDelivery(leadTimeDays: number = 12): string {
  const start = addBusinessDays(new Date(), leadTimeDays)
  const end = addBusinessDays(new Date(), leadTimeDays + 3)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}

/** Get the primary image URL from a product, with fallback */
export function primaryImage(
  images: Array<{ url: string; is_primary: boolean }> | null | undefined
): string {
  if (!images || images.length === 0) return '/placeholder-product.webp'
  const primary = images.find((img) => img.is_primary)
  return primary?.url ?? images[0]?.url ?? '/placeholder-product.webp'
}

/** Map order status to human-readable label and color */
export const ORDER_STATUS_MAP: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PLACED: { label: 'Order Placed', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  CONFIRMED: { label: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-50' },
  IN_PRODUCTION: { label: 'In Production', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  QUALITY_CHECK: { label: 'Quality Check', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  PACKED: { label: 'Packed', color: 'text-teal-700', bgColor: 'bg-teal-50' },
  SHIPPED: { label: 'Shipped', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  DELIVERED: { label: 'Delivered', color: 'text-green-800', bgColor: 'bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50' },
  REFUNDED: { label: 'Refunded', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}
