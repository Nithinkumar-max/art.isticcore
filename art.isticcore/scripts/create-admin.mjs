/**
 * One-time admin seeder.
 *
 * Creates (or resets) the admin accounts listed in ADMIN_EMAILS directly in
 * Supabase Auth — passwords are hashed by Supabase's auth server, never
 * stored or transmitted anywhere else. Nothing is hardcoded here: every
 * value is read from .env.local:
 *
 *   SUPABASE_URL?            -> NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 *   ADMIN_EMAILS              comma-separated admin emails (required)
 *   ADMIN_INITIAL_PASSWORD    password to set (required)
 *
 * Run:  node scripts/create-admin.mjs
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvLocal() {
  const env = {}
  try {
    for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match || line.trim().startsWith('#')) continue
      env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    console.error('Could not read .env.local — run this from the art.isticcore folder.')
    process.exit(1)
  }
  // .env.local may reference keys defined in .env
  try {
    for (const line of readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match || line.trim().startsWith('#')) continue
      if (!(match[1] in env)) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
  return env
}

const env = { ...loadEnvLocal(), ...process.env }
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const password = env.ADMIN_INITIAL_PASSWORD
const emails = (env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean)

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
if (!password || password.length < 8) {
  console.error('Set ADMIN_INITIAL_PASSWORD=<at least 8 chars> in .env.local first.')
  process.exit(1)
}
if (!emails.length) {
  console.error('No ADMIN_EMAILS found in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

for (const email of emails) {
  try {
    const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 500 })
    const user = existing?.users?.find((candidate) => candidate.email?.toLowerCase() === email)

    let userId = user?.id
    if (userId) {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      })
      if (error) throw error
      console.log(`• ${email}: password reset & confirmed`)
    } else {
      const name = email.split('@')[0].replace(/[._]/g, ' ')
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      })
      if (error) throw error
      userId = created.user.id
      console.log(`• ${email}: account created`)
    }

    // Ensure the public profile row exists and carries the ADMIN role.
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!profile) {
      const { error: insertError } = await supabase
        .from('users')
        .upsert({ id: userId, email, role: 'ADMIN' })
      if (insertError) throw insertError
    } else {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'ADMIN' })
        .eq('id', userId)
      if (updateError) throw updateError
    }
    console.log(`  └ role set to ADMIN`)
  } catch (error) {
    console.error(`✗ ${email} failed:`, error?.message ?? error)
    process.exitCode = 1
  }
}

console.log('\nDone. Sign in at /login?redirect=/admin')
