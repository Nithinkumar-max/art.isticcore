import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * Self-managed login codes.
 *
 * We generate the 6-digit code ourselves and deliver it through Resend —
 * Supabase's built-in email/SMTP is never used. To mint a Supabase session
 * afterwards we stash the admin `generateLink('magiclink')` token hash next
 * to our code; verifying the code server-side via `verifyOtp({ tokenHash })`
 * sets the SSR auth cookies.
 *
 * Storage: Upstash Redis when configured, otherwise an in-process Map
 * (fine for single-instance dev; Redis recommended in production).
 */

const OTP_TTL_SECONDS = 10 * 60 // code valid for 10 minutes
const RESEND_COOLDOWN_SECONDS = 60 // min gap between sends per email
const MAX_VERIFY_ATTEMPTS = 5

interface OtpRecord {
  codeHash: string
  tokenHash: string
  attempts: number
}

const upstashReady = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

/** In-process fallback store: key → { record, expiresAt } */
const memory = new Map<string, { record: OtpRecord; expiresAt: number }>()

function otpKey(email: string): string {
  return `auth:otp:${email.toLowerCase()}`
}

function cooldownKey(email: string): string {
  return `auth:otp-cooldown:${email.toLowerCase()}`
}

function resetKey(email: string): string {
  return `auth:reset:${email.toLowerCase()}`
}

function resetCooldownKey(email: string): string {
  return `auth:reset-cooldown:${email.toLowerCase()}`
}

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex')
}

export function generateCode(): string {
  return String(randomInt(100_000, 1_000_000))
}

async function getRecord(key: string): Promise<OtpRecord | null> {
  if (upstashReady) {
    try {
      const redisClient = (await import('@/lib/redis')).redis
      if (!redisClient) return null
      const raw = await redisClient.get<OtpRecord>(key)
      return raw ?? null
    } catch (error) {
      console.error('[OTP] redis get failed:', error)
      return null
    }
  }
  sweepMemory()
  const entry = memory.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    memory.delete(key)
    return null
  }
  return entry.record
}

async function setRecord(key: string, record: OtpRecord, ttlSeconds: number): Promise<void> {
  if (upstashReady) {
    try {
      const redisClient = (await import('@/lib/redis')).redis
      if (!redisClient) return
      await redisClient.set(key, record, { ex: ttlSeconds })
      return
    } catch (error) {
      console.error('[OTP] redis set failed:', error)
      throw new Error('Could not start the login session. Try again.')
    }
  }
  memory.set(key, { record, expiresAt: Date.now() + ttlSeconds * 1000 })
}

async function deleteRecord(key: string): Promise<void> {
  if (upstashReady) {
    try {
      const redisClient = (await import('@/lib/redis')).redis
      if (!redisClient) return
      await redisClient.del(key)
    } catch (error) {
      console.error('[OTP] redis del failed:', error)
    }
    return
  }
  memory.delete(key)
}

function sweepMemory(): void {
  const now = Date.now()
  for (const [key, entry] of memory) {
    if (entry.expiresAt < now) memory.delete(key)
  }
}

/**
 * True when a code was sent for this email recently (resend throttling).
 */
export async function isSendThrottled(email: string): Promise<boolean> {
  return Boolean(await getRecord(cooldownKey(email)))
}

/**
 * Generates a fresh 6-digit code, stores its hash together with the Supabase
 * magiclink token hash, and returns the plain code for delivery.
 */
export async function issueLoginCode(
  email: string,
  supabaseTokenHash: string,
): Promise<string> {
  const code = generateCode()
  await setRecord(otpKey(email), { codeHash: hashCode(email, code), tokenHash: supabaseTokenHash, attempts: 0 }, OTP_TTL_SECONDS)
  await setRecord(cooldownKey(email), { codeHash: '', tokenHash: '', attempts: 0 }, RESEND_COOLDOWN_SECONDS)
  return code
}

export type ConsumeResult =
  | { status: 'ok'; tokenHash: string }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'locked' }

/**
 * Checks a user-submitted code. Codes expire after MAX_VERIFY_ATTEMPTS wrong
 * tries or OTP_TTL_SECONDS, whichever happens first. On success the record is
 * burned immediately (single use).
 */
export async function consumeLoginCode(email: string, code: string): Promise<ConsumeResult> {
  const key = otpKey(email)
  const record = await getRecord(key)
  if (!record) return { status: 'expired' }

  const submitted = Buffer.from(hashCode(email, code))
  const stored = Buffer.from(record.codeHash)
  const matches = submitted.length === stored.length && timingSafeEqual(submitted, stored)

  if (!matches) {
    const attempts = record.attempts + 1
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await deleteRecord(key)
      return { status: 'locked' }
    }
    await setRecord(key, { ...record, attempts }, OTP_TTL_SECONDS)
    return { status: 'invalid' }
  }

  await deleteRecord(key)
  return { status: 'ok', tokenHash: record.tokenHash }
}

/**
 * True when a reset code was sent for this email recently (resend throttle).
 */
export async function isResetThrottled(email: string): Promise<boolean> {
  return Boolean(await getRecord(resetCooldownKey(email)))
}

/**
 * Generates and stores a 6-digit password-reset code, returning the plain
 * code for delivery. Unlike login codes there is no Supabase token to stash —
 * verification directly drives admin password update.
 */
export async function issueResetCode(email: string): Promise<string> {
  const code = generateCode()
  await setRecord(resetKey(email), { codeHash: hashCode(email, code), tokenHash: '', attempts: 0 }, OTP_TTL_SECONDS)
  await setRecord(resetCooldownKey(email), { codeHash: '', tokenHash: '', attempts: 0 }, RESEND_COOLDOWN_SECONDS)
  return code
}

export type ResetCodeResult = 'ok' | 'invalid' | 'expired' | 'locked'

/**
 * Checks a user-submitted reset code (single-use, TTL + attempt lockout).
 * The consumed flag lets callers burn the record after a successful reset.
 */
export async function verifyResetCode(email: string, code: string): Promise<ResetCodeResult> {
  const key = resetKey(email)
  const record = await getRecord(key)
  if (!record) return 'expired'

  const submitted = Buffer.from(hashCode(email, code))
  const stored = Buffer.from(record.codeHash)
  const matches = submitted.length === stored.length && timingSafeEqual(submitted, stored)

  if (!matches) {
    const attempts = record.attempts + 1
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await deleteRecord(key)
      return 'locked'
    }
    await setRecord(key, { ...record, attempts }, OTP_TTL_SECONDS)
    return 'invalid'
  }

  await deleteRecord(key)
  return 'ok'
}

/**
 * Best-effort per-IP rate limit shared by auth endpoints.
 * Uses fixed windows; generous on purpose — it only stops blatant abuse.
 */
const ipHits = new Map<string, { count: number; resetAt: number }>()

export function rateLimitIp(ip: string, limit = 10, windowSeconds = 300): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 })
    return true
  }
  entry.count += 1
  return entry.count <= limit
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
