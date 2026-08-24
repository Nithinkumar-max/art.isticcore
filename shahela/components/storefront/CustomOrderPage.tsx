'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState } from 'react'
import { ArrowRight, Check, CloudUpload, FileImage, Handshake, Hammer, MessageCircle, PackageCheck, PencilLine, Truck } from 'lucide-react'
import { CustomDesignSchema, type CustomDesignFormValues } from '@/lib/validations'

const processSteps = [
  { title: '1. Request', description: 'Submit your ideas, inspiration, and preferences.', icon: PencilLine },
  { title: '2. Consult', description: "We'll discuss details, yarn choices, and finalize the quote.", icon: MessageCircle },
  { title: '3. Craft', description: 'I begin crafting your piece with care and precision.', icon: Hammer },
  { title: '4. Delivery', description: 'Your custom creation is securely packaged and shipped.', icon: Truck },
]

export function CustomOrderPage() {
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof CustomDesignSchema>, unknown, z.output<typeof CustomDesignSchema>>({ resolver: zodResolver(CustomDesignSchema), defaultValues: { name: '', contact: '', email: '', description: '', budget: undefined, deadline: '' }, mode: 'onBlur' })

  const submit = async (values: z.output<typeof CustomDesignSchema>) => {
    setStatus('loading'); setError('')
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        await new Promise((resolve) => window.setTimeout(resolve, 650))
        setStatus('success')
        return
      }
      const response = await fetch('/api/custom-designs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, referenceImages: files.map((file) => file.name) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not submit request')
      setStatus('success')
    } catch (submitError) { setStatus('error'); setError(submitError instanceof Error ? submitError.message : 'Could not submit request') }
  }

  return <main className="pt-20"><section className="page-track relative overflow-hidden rounded-b-[38px] bg-gradient-to-br from-background-warm to-background-soft-pink px-5 py-16 text-center sm:px-10 md:py-24"><div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ac2a5d 1px, transparent 1px)', backgroundSize: '20px 20px' }} /><div className="relative mx-auto max-w-3xl"><p className="label-caps text-primary">Bespoke crochet studio</p><h1 className="mt-3 font-serif text-4xl font-semibold md:text-6xl">Bring your vision to life</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-on-surface-variant md:text-lg">Commission a unique, handcrafted crochet piece tailored to your exact specifications—from bespoke garments to personalized home decor.</p></div></section><section className="page-track py-16 md:py-20"><div className="mx-auto max-w-xl text-center"><p className="label-caps text-primary">A gentle process</p><h2 className="mt-2 font-serif text-4xl font-semibold">The commission process</h2><p className="mt-3 text-sm text-on-surface-variant">Four simple steps to your custom creation.</p></div><div className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-5"> <div className="absolute left-[12%] right-[12%] top-12 hidden h-px bg-outline-variant md:block" />{processSteps.map(({ title, description, icon: Icon }) => <div key={title} className="relative z-10 flex flex-col items-center text-center"><span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-container bg-surface text-primary soft-shadow"><Icon className="h-8 w-8" /></span><h3 className="mt-5 font-serif text-2xl">{title}</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-on-surface-variant">{description}</p></div>)}</div></section><section className="page-track grid gap-8 pb-24 lg:grid-cols-[1.6fr_0.9fr]"><form onSubmit={handleSubmit(submit)} className="surface-card p-5 sm:p-8"><div className="mb-7"><p className="label-caps text-primary">Tell us the little details</p><h2 className="mt-2 font-serif text-3xl">Start your request</h2></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Name" error={errors.name?.message}><input {...register('name')} placeholder="Jane Doe" className="form-input" /></Field><Field label="Phone or email" error={errors.contact?.message}><input {...register('contact')} placeholder="How can we reach you?" className="form-input" /></Field><Field label="Email address" error={errors.email?.message}><input {...register('email')} type="email" placeholder="jane@example.com" className="form-input" /></Field><Field label="Budget"><input {...register('budget')} type="number" placeholder="₹2,500" className="form-input" /></Field><Field label="Describe your idea" error={errors.description?.message} full><textarea {...register('description')} rows={5} placeholder="I would love a chunky cardigan in sage green with..." className="form-input resize-y rounded-2xl" /></Field><Field label="Requested deadline"><input {...register('deadline')} type="date" className="form-input" /></Field><Field label="Preferred colors / size"><input placeholder="Sage green, cream · Medium" className="form-input" /></Field></div><button type="submit" disabled={status === 'loading' || status === 'success'} className="focus-ring mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{status === 'loading' ? 'Sending your request...' : status === 'success' ? <>Request received <Check className="h-4 w-4" /></> : <>Continue to details <ArrowRight className="h-4 w-4" /></>}</button>{status === 'success' ? <p role="status" className="mt-4 rounded-xl bg-[#effcf1] px-4 py-3 text-sm text-tertiary">Thank you—your brief is with our studio. We’ll be in touch soon.</p> : null}{status === 'error' ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-error">{error}</p> : null}</form><aside className="h-fit rounded-[32px] bg-background-soft-pink p-6 sm:p-8"><h2 className="font-serif text-2xl">Additional info</h2><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Share an inspiration image if you have one. A rough sketch, screenshot, or favorite color palette is perfect.</p><label className="mt-7 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant bg-surface/60 px-5 text-center transition hover:bg-surface"><CloudUpload className="h-9 w-9 text-primary-container" /><span className="mt-3 text-sm font-semibold">Upload inspiration</span><span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">PNG, JPG up to 5MB</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /></label>{files.length ? <ul className="mt-4 space-y-2 text-xs text-on-surface-variant">{files.map((file) => <li key={file.name} className="flex items-center gap-2"><FileImage className="h-4 w-4 text-primary" />{file.name}</li>)}</ul> : null}<div className="mt-8 space-y-3 text-sm text-on-surface-variant"><p className="flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" />Free consultation before we quote</p><p className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-primary" />Carefully packed and insured</p></div></aside></section></main>
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? 'sm:col-span-2' : ''}`}><span className="label-caps text-on-surface-variant">{label}</span>{children}{error ? <span className="mt-1 block text-xs text-error">{error}</span> : null}</label> }
