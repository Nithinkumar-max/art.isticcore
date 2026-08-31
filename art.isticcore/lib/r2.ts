import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID!
const ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
const SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!
const PUBLIC_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL!

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
})

type UploadResult = {
  url: string
  key: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Upload a file buffer to Cloudflare R2.
 * Returns the public URL and the storage key.
 */
export async function uploadToR2(
  buffer: Buffer,
  mimeType: string,
  folder: string = 'products'
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed: ${ALLOWED_TYPES.join(', ')}`)
  }
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`File too large. Max size: 5MB`)
  }

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg')
  const key = `${folder}/${randomUUID()}.${ext}`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000',
    })
  )

  return {
    url: `${PUBLIC_URL}/${key}`,
    key,
  }
}

/**
 * Delete a file from R2 by its storage key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )
}

/**
 * Generate a pre-signed URL for temporary private access.
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    { expiresIn }
  )
}

/**
 * Extract the storage key from a full public URL.
 */
export function keyFromUrl(url: string): string {
  return url.replace(`${PUBLIC_URL}/`, '')
}
