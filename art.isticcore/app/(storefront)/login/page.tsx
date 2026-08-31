import { AuthPages } from '@/components/storefront/AuthPages'

export default async function LoginRoute({ searchParams }: { searchParams: Promise<{ redirect?: string | string[] }> }) {
  const params = await searchParams
  const redirect = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect
  return <AuthPages redirect={redirect} />
}
