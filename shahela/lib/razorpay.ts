import Razorpay from 'razorpay'
import crypto from 'crypto'

// Initialize Razorpay instance safely (avoid failing at build time if env missing)
export const razorpay: Razorpay | null =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    // Compare a dummy value to keep timing uniform, then fail.
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Verify Razorpay payment signature (timing-safe)
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    console.error('RAZORPAY_KEY_SECRET is not defined')
    return false
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  return safeEqual(generatedSignature, signature)
}

/**
 * Verify Razorpay webhook signature (timing-safe)
 */
export function verifyWebhookSignature({
  body,
  signature,
  webhookSecret,
}: {
  body: string
  signature: string
  webhookSecret?: string
}): boolean {
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not defined')
    return false
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex')

  return safeEqual(expectedSignature, signature)
}
