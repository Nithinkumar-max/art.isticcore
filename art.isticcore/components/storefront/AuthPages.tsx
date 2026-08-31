'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Sparkles } from 'lucide-react'
import { ProfileSchema, type ProfileFormValues } from '@/lib/validations'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useHydrated } from '@/lib/hooks/useHydrated'
import { createClient } from '@/lib/supabase/client'

type AuthStep = 'email' | 'otp' | 'profile'

type AuthMode = 'otp' | 'password'

interface FinalProfile {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'
}

/** After sign-in: sync DB profile (auto-promotes ADMIN_EMAILS) and route sensibly. */
async function finalizeSignIn(
  setUser: (user: FinalProfile) => void,
): Promise<FinalProfile | null> {
  const res = await fetch('/api/auth/profile', { method: 'POST' })
  const body = await res.json().catch(() => null)
  const profile = (body?.profile ?? null) as FinalProfile | null
  if (profile) {
    setUser({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      role: profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN' ? profile.role : 'CUSTOMER',
    })
  }
  return profile
}

export function AuthPages({ redirect = '/account' }: { redirect?: string }) {
  const router = useRouter()
  const isAdminRoute = redirect.startsWith('/admin')
  const storedUser = useAuthStore((state) => state.user)
  const hydrated = useHydrated()
  const [mode, setMode] = useState<AuthMode>('password')
  const [step, setStep] = useState<AuthStep>('email')
  const [sessionVerified, setSessionVerified] = useState(false)
  const [currentUser, setCurrentUser] = useState<FinalProfile | null>(null)

  // Verify session is actually valid before showing "already signed in"
  useEffect(() => {
    if (!hydrated || !storedUser) return
    let cancelled = false
    fetch('/api/auth/profile')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        const profile = body?.profile as FinalProfile | null
        if (profile && profile.id === storedUser.id) {
          setCurrentUser(profile)
        } else {
          // Stale store data — session expired or user logged out elsewhere
          useAuthStore.getState().logout()
        }
        setSessionVerified(true)
      })
      .catch(() => {
        if (!cancelled) setSessionVerified(true)
      })
    return () => { cancelled = true }
  }, [hydrated, storedUser])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const setUser = useAuthStore((state) => state.setUser)
  const clearCart = useCartStore((state) => state.clearCart)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { name: '', phone: '' },
    mode: 'onBlur',
  })

  const routeAfterAuth = (role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN') => {
    // Admins always land on the studio dashboard, whatever page they came from.
    if (role !== 'CUSTOMER') {
      router.push('/admin')
      return
    }
    if (redirect && redirect !== '/account') {
      router.push(redirect)
    } else {
      router.push('/account')
    }
  }

  /** A fresh sign-in must never inherit a basket left in localStorage. */
  const startCleanSession = () => clearCart()

  const signInWithPassword = async () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.')
      return
    }
    const wantsSignUp = isSignUp && !isAdminRoute
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (wantsSignUp && fullName.trim().length < 2) {
      setError('Tell us your name to create your account.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (wantsSignUp) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password, name: fullName.trim() }),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          setError(body?.error || 'Could not create your account. Try again.')
          return
        }
      }
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (signInError) {
        setError(
          wantsSignUp
            ? 'Account created! Signing you in failed — please try signing in.'
            : signInError.message === 'Invalid login credentials'
              ? 'Wrong email or password. Please try again.'
              : signInError.message,
        )
        return
      }
      startCleanSession()
      const profile = await finalizeSignIn(setUser)
      if (profile && !profile.name && !wantsSignUp) {
        setPendingUserId(profile.id)
        setValue('name', '')
        setStep('profile')
        return
      }
      routeAfterAuth(profile?.role ?? 'CUSTOMER')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not sign you in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Could not send the code. Try again.')
      setEmail(cleanEmail)
      setMessage(`6-digit code sent to ${body?.maskedEmail || cleanEmail}. Check your inbox and spam folder.`)
      setStep('otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send the code. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const verifyOtp = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Enter all 6 digits to continue.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Invalid or expired code.')

      // Session is live (server set the cookies) — start clean and sync profile.
      startCleanSession()
      const profile = await finalizeSignIn(setUser)
      setMessage('')
      if (!profile) throw new Error('Session could not be established.')
      if (profile.name) {
        routeAfterAuth(profile.role)
        return
      }
      setPendingUserId(profile.id)
      setValue('phone', '')
      setStep('profile')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally {
      setBusy(false)
    }
  }

  const resendOtp = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Could not resend. Try again.')
      setMessage('A fresh code is on its way.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const updateOtp = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item))
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const submitProfile = async (values: ProfileFormValues) => {
    if (!pendingUserId) return
    setBusy(true)
    try {
      const supabase = createClient()
      const cleanPhone = values.phone.replace(/\D/g, '').slice(-10)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: values.name,
          phone: cleanPhone ? `+91${cleanPhone}` : null,
        })
        .eq('id', pendingUserId)
      if (updateError) throw updateError
      const profile = await finalizeSignIn(setUser)
      routeAfterAuth(profile?.role ?? 'CUSTOMER')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background-soft-pink to-surface px-4 pb-16 pt-28 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="focus-ring mb-8 inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm text-on-surface-variant hover:text-primary">
          <ArrowLeft className="h-4 w-4" />Back to the studio
        </Link>
        {currentUser && sessionVerified && step === 'email' ? (
          <div className="surface-card mb-6 flex flex-wrap items-center justify-between gap-3 p-4 text-left text-xs text-on-surface-variant" role="status">
            <span>
              Already signed in as <strong className="text-on-surface">{currentUser.email}</strong>
              {currentUser.role !== 'CUSTOMER' ? ' · admin' : ''} — this browser holds one account at a time.
            </span>
            <span className="flex gap-2">
              {currentUser.role !== 'CUSTOMER' ? <Link href="/admin" className="focus-ring rounded-full bg-primary-container px-3 py-1.5 font-semibold text-white hover:bg-primary-dark">Admin dashboard</Link> : null}
              <Link href="/account" className="focus-ring rounded-full border border-outline-variant px-3 py-1.5 font-semibold text-on-surface-variant hover:border-primary hover:text-primary">My account</Link>
            </span>
          </div>
        ) : null}
        {step === 'email' ? (
          mode === 'password' || isAdminRoute ? (
            <PasswordStep email={email} setEmail={setEmail} password={password} setPassword={setPassword} fullName={fullName} setFullName={setFullName} isSignUp={isSignUp && !isAdminRoute} setIsSignUp={setIsSignUp} onSubmit={signInWithPassword} busy={busy} error={error} onSwitchMode={() => { setMode('otp'); setError(''); setMessage('') }} isAdminRoute={isAdminRoute} />
          ) : (
            <EmailStep email={email} setEmail={setEmail} onSubmit={sendOtp} busy={busy} message={message} error={error} onSwitchMode={() => { setMode('password'); setError(''); setMessage('') }} />
          )
        ) : null}
        {step === 'otp' && !isAdminRoute ? <OtpStep email={email} otp={otp} busy={busy} onChange={updateOtp} refs={otpRefs} onSubmit={verifyOtp} onEdit={() => { setStep('email'); setMessage(''); setError('') }} onResend={resendOtp} message={message} error={error} /> : null}
        {step === 'profile' ? <ProfileStep register={register} errors={errors} busy={busy} onSubmit={handleSubmit(submitProfile)} error={error} /> : null}
      </div>
    </main>
  )
}

function PasswordStep({
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  isSignUp,
  setIsSignUp,
  onSubmit,
  busy,
  error,
  onSwitchMode,
  isAdminRoute,
}: {
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  fullName: string
  setFullName: (value: string) => void
  isSignUp: boolean
  setIsSignUp: (value: boolean) => void
  onSubmit: () => void
  busy: boolean
  error: string
  onSwitchMode: () => void
  isAdminRoute: boolean
}) {
  return (
    <section className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-fixed bg-surface soft-shadow"><LockKeyhole className="h-10 w-10 text-primary" /></div>
      <p className="label-caps mt-8 text-primary">{isAdminRoute ? 'Studio dashboard' : 'Welcome to Art.isticcore'}</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">{isSignUp ? 'Create your account' : isAdminRoute ? 'Admin sign in' : 'Sign in'}</h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{isSignUp ? 'Pick a password to keep your saved pieces and orders in one place.' : isAdminRoute ? 'Restricted area — sign in with your admin email and password.' : 'Sign in with your email and password.'}</p>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit() }} className="mt-8 space-y-4 text-left">
        {isSignUp ? (
          <label className="block"><span className="label-caps text-on-surface-variant">Your name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" autoComplete="name" placeholder="Your full name" suppressHydrationWarning className="focus-ring mt-2 min-h-12 w-full rounded-full border border-outline-variant bg-surface px-5 text-sm outline-none placeholder:text-outline focus-within:border-primary-container" /></label>
        ) : null}
        <label className="block"><span className="label-caps text-on-surface-variant">Email address</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" suppressHydrationWarning className="focus-ring mt-2 min-h-12 w-full rounded-full border border-outline-variant bg-surface px-5 text-sm outline-none placeholder:text-outline focus-within:border-primary-container" /></label>
        <label className="block"><span className="label-caps text-on-surface-variant">Password</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder={isSignUp ? 'At least 8 characters' : 'Your password'} suppressHydrationWarning className="focus-ring mt-2 min-h-12 w-full rounded-full border border-outline-variant bg-surface px-5 text-sm outline-none placeholder:text-outline focus-within:border-primary-container" /></label>
        <button type="submit" disabled={busy} suppressHydrationWarning className="focus-ring flex min-h-14 w-full items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{busy ? (isSignUp ? 'Creating account...' : 'Signing in...') : isSignUp ? 'Create account & sign in' : 'Sign in'}</button>
      </form>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}
      {!isAdminRoute ? (
        <>
          <p className="mt-6 text-center text-xs text-on-surface-variant">
            {isSignUp ? 'Already have an account? ' : 'New here? '}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-primary underline">{isSignUp ? 'Sign in instead' : 'Create an account'}</button>
          </p>
          <p className="mt-3 text-center text-xs text-on-surface-variant">Prefer a one-time code? <button type="button" onClick={onSwitchMode} className="font-semibold text-primary underline">Login with email code</button></p>
          {!isSignUp ? <p className="mt-6 text-center text-xs leading-relaxed text-on-surface-variant">By continuing, you agree to our Terms of Service and Privacy Policy.</p> : null}
        </>
      ) : null}
    </section>
  )
}

function EmailStep({ email, setEmail, onSubmit, busy, message, error, onSwitchMode }: { email: string; setEmail: (value: string) => void; onSubmit: () => void; busy: boolean; message: string; error: string; onSwitchMode: () => void }) {
  return (
    <section className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-fixed bg-surface soft-shadow"><Sparkles className="h-10 w-10 text-primary" /></div>
      <p className="label-caps mt-8 text-primary">Welcome to the handmade edit</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">Welcome back!</h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">Enter your email and we&apos;ll send you a 6-digit login code. New here? We&apos;ll set you up automatically.</p>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit() }} className="mt-8 space-y-4 text-left">
        <label className="block"><span className="label-caps text-on-surface-variant">Email address</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" suppressHydrationWarning className="focus-ring mt-2 min-h-12 w-full rounded-full border border-outline-variant bg-surface px-5 text-sm outline-none placeholder:text-outline focus-within:border-primary-container" /></label>
        <button type="submit" disabled={busy} suppressHydrationWarning className="focus-ring flex min-h-14 w-full items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{busy ? 'Sending code...' : 'Send login code'}</button>
      </form>
      {message ? <p role="status" className="mt-4 rounded-xl bg-surface px-4 py-3 text-xs text-primary">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}
      <p className="mt-6 text-center text-xs text-on-surface-variant">Have a password? <button type="button" onClick={onSwitchMode} className="font-semibold text-primary underline">Login with password</button></p>
      <p className="mt-8 text-center text-xs leading-relaxed text-on-surface-variant">By continuing, you agree to our <Link href="/terms" className="text-primary underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.</p>
    </section>
  )
}

function OtpStep({ email, otp, busy, onChange, refs, onSubmit, onEdit, onResend, message, error }: { email: string; otp: string[]; busy: boolean; onChange: (index: number, value: string) => void; refs: React.MutableRefObject<Array<HTMLInputElement | null>>; onSubmit: () => void; onEdit: () => void; onResend: () => void; message: string; error: string }) {
  return (
    <section className="surface-card p-6 text-center sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background-soft-pink text-primary"><LockKeyhole className="h-6 w-6" /></div>
      <p className="label-caps mt-5 text-primary">Almost there</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">Enter code</h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">We sent a 6-digit code to<br /><strong className="text-on-surface">{email}</strong> <button type="button" onClick={onEdit} className="text-primary underline">Edit</button></p>
      <div className="mt-7 flex justify-between gap-2">
        {otp.map((value, index) => (
          <input key={index} ref={(element) => { refs.current[index] = element }} value={value} onChange={(event) => onChange(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !otp[index] && index > 0) refs.current[index - 1]?.focus() }} inputMode="numeric" maxLength={1} aria-label={`Code digit ${index + 1}`} suppressHydrationWarning className="focus-ring h-12 min-w-0 flex-1 rounded-xl border border-surface-dim bg-surface-container-low text-center font-serif text-2xl" />
        ))}
      </div>
      <button type="button" onClick={onSubmit} disabled={busy} suppressHydrationWarning className="focus-ring mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{busy ? 'Verifying...' : 'Verify & continue'} {!busy ? <ArrowRight className="h-4 w-4" /> : null}</button>
      {message ? <p role="status" className="mt-4 rounded-xl bg-background-soft-pink px-4 py-3 text-xs text-primary">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}
      <p className="mt-6 text-xs text-on-surface-variant">Didn&apos;t receive the code? <button type="button" onClick={onResend} disabled={busy} className="font-semibold text-primary underline disabled:opacity-60">Resend code</button></p>
    </section>
  )
}

function ProfileStep({ register, errors, busy, onSubmit, error }: { register: UseFormRegister<ProfileFormValues>; errors: FieldErrors<ProfileFormValues>; busy: boolean; onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>; error: string }) {
  return (
    <section className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-primary"><Sparkles className="h-7 w-7" /></div>
      <p className="label-caps mt-7 text-primary">One last stitch</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">Complete your profile</h1>
      <p className="mt-3 text-sm text-on-surface-variant">Just a few details to personalize your studio.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5 text-left">
        <label className="block"><span className="label-caps text-on-surface-variant">What should we call you?</span><input {...register('name')} placeholder="Your preferred name" suppressHydrationWarning className="focus-ring mt-2 w-full rounded-full border border-surface-dim bg-surface px-5 py-3.5 text-sm" />{errors.name ? <span className="mt-1 block text-xs text-error">{errors.name.message}</span> : null}</label>
        <label className="block"><span className="label-caps text-on-surface-variant">Phone number</span><input {...register('phone')} placeholder="10-digit mobile" inputMode="numeric" suppressHydrationWarning className="focus-ring mt-2 w-full rounded-full border border-surface-dim bg-surface px-5 py-3.5 text-sm" />{errors.phone ? <span className="mt-1 block text-xs text-error">{errors.phone.message}</span> : null}</label>
        {error ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}
        <button type="submit" disabled={busy} suppressHydrationWarning className="focus-ring flex min-h-14 w-full items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{busy ? 'Saving...' : 'Continue shopping'} {!busy ? <Check className="ml-2 h-4 w-4" /> : null}</button>
      </form>
      <p className="mt-7 flex items-center justify-center gap-2 text-xs text-on-surface-variant"><LockKeyhole className="h-3.5 w-3.5" />Your information is secure</p>
    </section>
  )
}
