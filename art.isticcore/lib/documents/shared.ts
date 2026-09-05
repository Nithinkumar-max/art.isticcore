import type { OrderWithItems } from '@/types'

export interface Palette {
  ink: [number, number, number]
  muted: [number, number, number]
  faint: [number, number, number]
  accent: [number, number, number]
  line: [number, number, number]
}

/**
 * Artisanal Grace palette mapped to RGB tuples for jsPDF.
 *   ink    -> on-surface (#1c1b1b)
 *   muted  -> on-surface-variant (#574146)
 *   faint  -> outline (#8a7176)
 *   accent -> primary (#ac2a5d)
 *   line   -> outline-variant (#ddbfc5)
 */
export const PALETTE: Palette = {
  ink: [28, 27, 27],
  muted: [87, 65, 70],
  faint: [138, 113, 118],
  accent: [172, 42, 93],
  line: [221, 191, 197],
}

export function formatINR(amount: number): string {
  const num = Number.isFinite(amount) ? amount : 0
  return `\u20B9${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase()
}

/** Absolute logged-in tracking URL for QR codes. Server-safe (no `window`). */
export function orderTrackingUrl(orderId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '')
  if (base && !/^https?:\/\/localhost(?::\d+)?$/i.test(base)) {
    return `${base}/orders/${orderId}`
  }
  return `https://art.isticcore.in/orders/${orderId}`
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'PAID'
    case 'pending':
      return 'PENDING'
    case 'failed':
      return 'FAILED'
    case 'refunded':
      return 'REFUNDED'
    case 'partially_refunded':
      return 'PARTIALLY REFUNDED'
    case 'cod_pending':
      return 'COD'
    case 'cod_collected':
      return 'COD COLLECTED'
    default:
      return status.replace(/_/g, ' ').toUpperCase()
  }
}

export function isPaid(order: OrderWithItems): boolean {
  const ps = order.payment_status
  return (
    ps === 'paid' ||
    ps === 'cod_collected' ||
    (order.payment_method === 'cod' && ps === 'cod_pending')
  )
}

/** Build the full shipping address lines, gracefully handling missing parts. */
export function addressLines(address: OrderWithItems['address'] | null | undefined): string[] {
  if (!address) return []
  const lines = [address.full_name, address.line1]
  if (address.line2) lines.push(address.line2)
  const cityStatePin = [
    address.city,
    address.state,
    address.pincode ? `${address.pincode}` : '',
  ]
    .filter(Boolean)
    .join(', ')
  if (cityStatePin) lines.push(cityStatePin)
  if (address.phone) lines.push(`Phone: ${address.phone}`)
  return lines.filter((l): l is string => Boolean(l))
}
