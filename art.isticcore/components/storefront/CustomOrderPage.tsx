'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCallback, useState } from 'react'
import { ArrowRight, Check, CloudUpload, FileImage, Handshake, Hammer, MessageCircle, PackageCheck, PencilLine, Truck, X } from 'lucide-react'
import { CustomDesignSchema, type CustomDesignFormValues } from '@/lib/validations'

const processSteps = [
  { title: '1. Request', description: 'Submit your ideas, inspiration, and preferences.', icon: PencilLine },
  { title: '2. Consult', description: "We'll discuss details, yarn choices, and finalize the quote.", icon: MessageCircle },
  { title: '3. Craft', description: 'I begin crafting your piece with care and precision.', icon: Hammer },
  { title: '4. Delivery', description: 'Your custom creation is securely packaged and shipped.', icon: Truck },
]

function BlockNumberScroll({ onWheel }: { onWheel?: React.WheelEventHandler<HTMLInputElement> }) {
  const block = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
    onWheel?.(e)
  }, [onWheel])
  return block
}

export function CustomOrderPage() {
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof CustomDesignSchema>, unknown, z.output<typeof CustomDesignSchema>>({ resolver: zodResolver(CustomDesignSchema), defaultValues: { name: '', contact: '', email: '', description: '', budget: undefined, deadline: '' }, mode: 'onBlur' })
  const blockScroll = BlockNumberScroll({})

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles((current) => [...current, ...Array.from(incoming)].slice(0, 5))
  }
  const removeFile = (name: string) => setFiles((current) => current.filter((file) => file.name !== name))

  const submit = async (values: z.output<typeof CustomDesignSchema>) => {
    setStatus('loading'); setError('')
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        await new Promise((resolve) => window.setTimeout(resolve, 650))
        setStatus('success')
        return
      }
      const form = new FormData()
      form.set('name', values.name)
      form.set('contact', values.contact)
      if (values.email) form.set('email', values.email)
      form.set('description', values.description)
      if (values.budget !== undefined) form.set('budget', String(values.budget))
      if (values.deadline) form.set('deadline', values.deadline)
      for (const file of files) form.append('images', file)
      const response = await fetch('/api/custom-designs', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not submit request')
      setStatus('success')
      setFiles([])
    } catch (submitError) { setStatus('error'); setError(submitError instanceof Error ? submitError.message : 'Could not submit request') }
  }

  return <main className="pt-20"><section className="page-track relative overflow-hidden rounded-b-[38px] bg-gradient-to-br from-background-warm to-background-soft-pink px-5 py-8 text-center sm:px-10 md:py-10"><div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ac2a5d 1px, transparent 1px)', backgroundSize: '20px 20px' }} /><div className="relative mx-auto max-w-3xl"><p className="label-caps text-primary">Bespoke crochet studio</p><h1 className="mt-3 font-serif text-4xl font-semibold md:text-5xl">Bring your vision to life</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant md:text-lg">Commission a unique, handcrafted crochet piece tailored to your exact specifications—from bespoke garments to personalized home decor.</p></div></section><section className="page-track pb-8 pt-2 md:pb-10"><div className="mx-auto max-w-xl text-center"><p className="label-caps text-primary">A gentle process</p><h2 className="mt-2 font-serif text-4xl font-semibold">The commission process</h2></div><div className="relative mt-6 grid gap-6 md:grid-cols-4 md:gap-5"> <div className="absolute left-[12%] right-[12%] top-12 hidden h-px bg-outline-variant md:block" />{processSteps.map(({ title, description, icon: Icon }) => <div key={title} className="relative z-10 flex flex-col items-center text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary-container bg-surface text-primary soft-shadow"><Icon className="h-6 w-6" /></span><h3 className="mt-3 font-serif text-xl">{title}</h3><p className="mt-1.5 max-w-xs text-sm leading-relaxed text-on-surface-variant">{description}</p></div>)}</div></section><section className="page-track grid gap-6 pb-14 lg:grid-cols-[1.6fr_0.9fr]"><form onSubmit={handleSubmit(submit)} className="surface-card p-5 sm:p-8"><div className="mb-6"><p className="label-caps text-primary">Tell us the little details</p><h2 className="mt-2 font-serif text-3xl">Share your vision</h2><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Tell us about your dream piece — colors, textures, size, and any inspiration you have in mind.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name" error={errors.name?.message}><input {...register('name')} placeholder="What should we call you?" className="form-input" /></Field><Field label="Phone number" error={errors.contact?.message}><input {...register('contact')} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} className="form-input" /></Field><Field label="Email address (optional)" error={errors.email?.message} full><input {...register('email')} type="email" placeholder="you@example.com" className="form-input" /></Field><Field label="Describe your design" error={errors.description?.message} full><textarea {...register('description')} rows={5} placeholder="Colors, size, texture, inspiration — the more detail, the better we can bring it to life." className="form-input resize-y rounded-2xl" /></Field><Field label="Budget (optional)" error={errors.budget?.message}><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">₹</span><input {...register('budget')} type="number" inputMode="decimal" placeholder="e.g. 5000" onWheel={blockScroll} className="form-input pl-8" /></div></Field><Field label="Preferred deadline (optional)" error={errors.deadline?.message}><input {...register('deadline')} type="date" className="form-input" /></Field></div>{status === 'success' ? <div className="mt-6 rounded-2xl border border-[#c8e6c9] bg-[#f1f8e9] p-5 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c8e6c9] text-[#2e7d32] mx-auto"><Check className="h-6 w-6" /></span><p className="mt-3 font-serif text-xl font-semibold text-[#1b5e20]">Request received!</p><p className="mt-1 text-sm text-[#33691e]">We&apos;ll review your brief and get back to you within 24 hours.</p><button type="button" onClick={() => setStatus('idle')} className="mt-4 text-sm font-semibold text-[#2e7d32] underline">Submit another request</button></div> : <><div className="mt-6"><p className="label-caps text-on-surface-variant">Reference images (optional)</p><p className="mt-1 text-xs text-on-surface-variant">Upload up to 5 images — JPG, PNG or WEBP, max 5 MB each.</p><div className="mt-3 flex flex-wrap gap-3">{files.map((file) => <div key={file.name} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low"><img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" /><button type="button" onClick={() => removeFile(file.name)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white" aria-label={`Remove ${file.name}`}><X className="h-3 w-3" /></button></div>)}{files.length < 5 ? <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary"><CloudUpload className="h-5 w-5" /><span className="mt-1 text-[10px]">Add</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} /></label> : null}</div></div>{error ? <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-error">{error}</p> : null}<button type="submit" disabled={status === 'loading'} className="focus-ring mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-container text-sm font-semibold text-white pink-glow hover:bg-primary-dark disabled:opacity-60">{status === 'loading' ? 'Submitting...' : <>Submit request <ArrowRight className="h-4 w-4" /></>}</button></>}</form><aside className="space-y-5"><div className="surface-card p-5 sm:p-6"><p className="label-caps text-primary">What happens next?</p><ul className="mt-4 space-y-4"><li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-soft-pink text-primary"><Handshake className="h-4 w-4" /></span><div><p className="text-sm font-semibold">We review your brief</p><p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">Our design team studies your inspiration and requirements.</p></div></li><li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-soft-pink text-primary"><MessageCircle className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Consultation & quote</p><p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">We discuss yarn, timeline, and share a transparent quote.</p></div></li><li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-soft-pink text-primary"><Hammer className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Crafting begins</p><p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">Your piece is hand-crocheted with care and precision.</p></div></li><li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-soft-pink text-primary"><PackageCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Quality check & delivery</p><p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">Inspected, packed with love, and shipped to your door.</p></div></li></ul></div><div className="surface-card p-5 sm:p-6"><p className="label-caps text-primary">Need help?</p><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">Have questions before submitting? Email us at <a href="mailto:artisticcore@gmail.com" className="font-semibold text-primary underline">artisticcore@gmail.com</a></p></div></aside></section></main>
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? 'sm:col-span-2' : ''}`}><span className="label-caps text-on-surface-variant">{label}</span>{children}{error ? <span className="mt-1 block text-xs text-error">{error}</span> : null}</label> }
