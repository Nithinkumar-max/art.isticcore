import Link from 'next/link'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

/**
 * /admin/login — Studio (admin) sign-in. Separate from the customer login
 * page: only ADMIN/SUPER_ADMIN credentials are accepted, evaluated server-side.
 */
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-admin-canvas px-4 py-10 text-on-surface sm:py-16">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="text-center">
          <p className="font-serif text-4xl font-semibold text-primary-container">Art.isticcore</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-on-surface-variant">Management portal</p>
          <div className="mx-auto mt-6 h-px w-16 bg-admin-border" />
        </div>
        <AdminLoginForm />
        <p className="mt-8 text-center text-xs text-on-surface-variant">
          <Link href="/" className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark">
            ← Back to the studio
          </Link>
        </p>
      </div>
    </main>
  )
}