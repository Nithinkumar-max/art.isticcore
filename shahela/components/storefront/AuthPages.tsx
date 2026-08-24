'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Sparkles } from 'lucide-react'
import { ProfileSchema, type ProfileFormValues } from '@/lib/validations'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type AuthStep = 'email' | 'otp' | 'profile'

export function AuthPages({ redirect = '/account' }: { redirect?: string }) {
  const router = useRouter()
  const [step, setStep] = useState<AuthStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const setUser = useAuthStore((state) => state.setUser)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { name: '', phone: '' },
    mode: 'onBlur',
  })

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
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: true },
      })
      if (otpError) throw otpError
      setEmail(cleanEmail)
      setMessage(`6-digit code sent to ${cleanEmail}. Check your inbox and spam folder.`)
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
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })
      if (verifyError) throw verifyError
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session could not be established.')
      setSessionUser(user)
      setValue('phone', '')
      setMessage('')
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
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (otpError) throw otpError
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
    if (!sessionUser) return
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
        .eq('id', sessionUser.id)
      if (updateError) throw updateError
      setUser({
        id: sessionUser.id,
        name: values.name,
        phone: cleanPhone ? `+91 ${cleanPhone}` : null,
        email: sessionUser.email ?? null,
        role: 'CUSTOMER',
      })
      router.push(redirect)
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
        {step === 'email' ? <EmailStep email={email} setEmail={setEmail} onSubmit={sendOtp} busy={busy} message={message} error={error} /> : null}
        {step === 'otp' ? <OtpStep email={email} otp={otp} busy={busy} onChange={updateOtp} refs={otpRefs} onSubmit={verifyOtp} onEdit={() => { setStep('email'); setMessage(''); setError('') }} onResend={resendOtp} message={message} error={error} /> : null}
        {step === 'profile' ? <ProfileStep register={register} errors={errors} busy={busy} onSubmit={handleSubmit(submitProfile)} error={error} /> : null}
      </div>
    </main>
  )
}

function EmailStep({ email, setEmail, onSubmit, busy, message, error }: { email: string; setEmail: (value: string) => void; onSubmit: () => void; busy: boolean; message: string; error: string }) {
  return (
    <section className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-fixed bg-surface soft-shadow"><Sparkles className="h-10 w-10 text-primary" /></div>
      <p className="label-caps mt-8 text-primary">Welcome to the handmade edit</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">Welcome back!</h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">Enter your email to continue to your saved pieces and order history. New here? We&apos;ll set you up automatically.</p>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit() }} className="mt-8 space-y-4 text-left">
        <label className="block"><span className="label-caps text-on-surface-variant">Email address</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" className="focus-ring mt-2 min-h-12 w-full rounded-full border border-outline-variant bg-surface px-5 text-sm outline-none placeholder:text-outline focus-within:border-primary-container" /></label>
        <button type="submit" disabled={busy} className="focus-ring flex min-h-14 w-full items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{busy ? 'Sending code...' : 'Send login code'}</button>
      </form>
      {message ? <p role="status" className="mt-4 rounded-xl bg-surface px-4 py-3 text-xs text-primary">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}
      <p className="mt-8 text-center text-xs leading-relaxed text-on-surface-variant">By continuing, you agree to our <a href="#" className="text-primary underline">Terms of Service</a> and <a href="#" className="text-primary underline">Privacy Policy</a>.</p>
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
          <input key={index} ref={(element) => { refs.current[index] = element }} value={value} onChange={(event) => onChange(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !otp[index] && index > 0) refs.current[index - 1]?.focus() }} inputMode="numeric" maxLength={1} aria-label={`Code digit ${index + 1}`} className="focus-ring h-12 min-w-0 flex-1 rounded-xl border border-surface-dim bg-surface-container-low text-center font-serif text-2xl" />
        ))}
      </div>
      <button type="button" onClick={onSubmit} disabled={busy} className="focus-ring mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{busy ? 'Verifying...' : 'Verify & continue'} {!busy ? <ArrowRight className="h-4 w-4" /> : null}</button>
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
        <label className="block"><span className="label-caps text-on-surface-variant">What should we call you?</span><input {...register('name')} placeholder="Your preferred name" className="focus-ring mt-2 w-full rounded-full border border-surface-dim bg-surface px-5 py-3.5 text-sm" />{errors.name ? <span className="mt-1 block text-xs text-error">{errors.name.message}</span> : null}</label>
        <label className="block"><span className="label-caps text-on-surface-variant">Phone number</span><input {...register('phone')} placeholder="10-digit mobile" inputMode="numeric" className="focus-ring mt-2 w-full rounded-full border border-surface-dim bg-surface px-5 py-3.5 text-sm" />{errors.phone ? <span className="mt-1 block text-xs text-error">{errors.phone.message}</span> : null}</label>
        {error ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}
        <button type="submit" disabled={busy} className="focus-ring flex min-h-14 w-full items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{busy ? 'Saving...' : 'Continue shopping'} {!busy ? <Check className="ml-2 h-4 w-4" /> : null}</button>
      </form>
      <p className="mt-7 flex items-center justify-center gap-2 text-xs text-on-surface-variant"><LockKeyhole className="h-3.5 w-3.5" />Your information is secure</p>
    </section>
  )
}
