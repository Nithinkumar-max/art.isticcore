'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CreditCard, MapPin, PackageCheck, PieChart, Truck } from 'lucide-react'
import { AddressSchema, type AddressFormValues } from '@/lib/validations'
import { usePincode } from '@/lib/hooks/usePincode'
import { useCheckout } from '@/lib/hooks/useCheckout'
import { useHydrated } from '@/lib/hooks/useHydrated'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { CheckoutStepper, OrderSummary, type SummaryItem } from '@/components/storefront/StorefrontPrimitives'
import type { PaymentMethod } from '@/types'

const fields: Array<{ name: keyof AddressFormValues; label: string; placeholder: string; type?: string; full?: boolean }> = [
  { name: 'full_name', label: 'Full name', placeholder: 'Enter your full name' },
  { name: 'phone', label: 'Mobile number', placeholder: '+91 98765 43210', type: 'tel' },
  { name: 'pincode', label: 'Pin code', placeholder: '6 digit PIN code', type: 'text' },
  { name: 'line1', label: 'Flat, house no., building, company', placeholder: 'Address line', full: true },
  { name: 'line2', label: 'Area, street, sector, village', placeholder: 'Optional address line', full: true },
  { name: 'city', label: 'Town / city', placeholder: 'Ludhiana' },
  { name: 'state', label: 'State', placeholder: 'Punjab' },
]

function FieldError({ message }: { message?: string }) { return message ? <span className="mt-1 text-xs text-error">{message}</span> : null }

interface AddressVM {
  id: string
  label: string
  fullName: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
}

function AddressStep({ onContinue }: { onContinue: (addressId: string) => void }) {
  const [selected, setSelected] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [pincodeMessage, setPincodeMessage] = useState('Great! We deliver to Ludhiana · estimated delivery 15–20 days')
  const { checkPincode, loading: checking } = usePincode()
  const queryClient = useQueryClient()
  const { data: savedAddresses = [], refetch } = useQuery<AddressVM[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await fetch('/api/account/addresses')
      if (!res.ok) return []
      return res.json()
    },
  })
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressError, setAddressError] = useState('')
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.input<typeof AddressSchema>, unknown, z.output<typeof AddressSchema>>({ resolver: zodResolver(AddressSchema), defaultValues: { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', landmark: '', is_default: false }, mode: 'onBlur' })

  const submitNewAddress = async (values: z.output<typeof AddressSchema>) => {
    setSavingAddress(true)
    setAddressError('')
    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Home',
          fullName: values.full_name,
          phone: values.phone.replace(/\D/g, '').slice(-10),
          line1: values.line1,
          line2: values.line2 || undefined,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
        }),
      })
      if (res.ok) {
        await refetch()
        reset()
        setFormOpen(false)
      } else if (res.status === 401) {
        setAddressError('Please log in first so we can save your address securely.')
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setAddressError(body?.error || 'Could not save the address. Try again.')
      }
    } catch {
      setAddressError('Network problem while saving. Check your connection and retry.')
    } finally {
      setSavingAddress(false)
    }
    setPincodeMessage(`Great! We deliver to ${values.city} · estimated delivery 15–20 days`)
  }
  const checkSavedPincode = async (pincode: string) => { const result = await checkPincode(pincode); if (result?.isServiceable) setPincodeMessage(`Great! We deliver to ${result.city || 'your area'} · estimated delivery ${result.estimatedDays} days`); else if (pincode === '141001') setPincodeMessage('Great! We deliver to Ludhiana · estimated delivery 15–20 days'); else setPincodeMessage('We are checking this area with our delivery partners.') }

  return <section className="flex flex-col gap-5"><div className="flex items-start justify-between gap-4"><div><p className="label-caps text-primary">Step 2 of 3</p><h1 className="mt-2 font-serif text-4xl font-semibold">Delivery address</h1><p className="mt-2 text-sm text-on-surface-variant">Choose where your handmade pieces should arrive.</p></div><Link href="/cart" className="focus-ring mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Back to cart</Link></div>{!savedAddresses.length && !formOpen ? <div className="surface-card p-5 text-sm text-on-surface-variant">No saved addresses yet — add one below to continue.</div> : null}<div className="grid gap-4 md:grid-cols-2">{savedAddresses.map((address) => <label key={address.id} className={`surface-card relative cursor-pointer p-5 transition hover:border-primary-container ${selected === address.id ? 'border-2 border-primary' : 'opacity-80'}`}><input type="radio" name="address" checked={selected === address.id} onChange={() => setSelected(address.id)} className="sr-only" /><div className="flex items-start justify-between"><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selected === address.id ? 'bg-background-soft-pink text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{address.label}</span>{selected === address.id ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"><Check className="h-3.5 w-3.5" /></span> : null}</div><h2 className="mt-4 font-serif text-xl font-semibold">{address.fullName}</h2><p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{address.line1}<br />{address.city}, {address.state} · {address.pincode}</p><p className="mt-3 text-sm text-on-surface-variant">{address.phone}</p></label>)}</div><button type="button" onClick={() => setFormOpen((value) => !value)} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-primary px-5 text-sm font-semibold text-primary hover:bg-background-soft-pink"><MapPin className="h-4 w-4" />{formOpen ? 'Close address form' : 'Add a new address'}</button>{addressError ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-error">{addressError}</p> : null}{formOpen ? <form onSubmit={handleSubmit(submitNewAddress)} className="surface-card p-5 sm:p-7"><div className="mb-6 flex items-center gap-3"><MapPin className="h-6 w-6 text-primary" /><h2 className="font-serif text-2xl">Add new address</h2></div><div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field.name} className={field.full ? 'sm:col-span-2' : ''}><span className="label-caps text-on-surface-variant">{field.label}</span><input {...register(field.name)} type={field.type || 'text'} placeholder={field.placeholder} onBlur={(event) => field.name === 'pincode' && event.target.value.length === 6 ? void checkSavedPincode(event.target.value) : undefined} className="focus-ring mt-2 w-full rounded-full border border-surface-dim bg-surface-container-low px-4 py-3 text-sm placeholder:text-on-surface-variant/60" />{field.name === 'pincode' && checking ? <span className="mt-1 text-xs text-on-surface-variant">Checking delivery...</span> : null}<FieldError message={errors[field.name]?.message as string | undefined} /></label>)}</div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setFormOpen(false)} className="focus-ring rounded-full border-2 border-primary px-5 py-3 text-sm font-semibold text-primary">Cancel</button><button type="submit" disabled={savingAddress} className="focus-ring rounded-full bg-primary-container px-6 py-3 text-sm font-semibold text-white pink-glow disabled:opacity-60">{savingAddress ? 'Saving…' : 'Save address'}</button></div></form> : null}<div className="flex items-start gap-3 rounded-2xl border border-tertiary-container/60 bg-[#effcf1] p-4 text-sm text-on-tertiary-container"><PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" /><span>{pincodeMessage}</span></div><button type="button" onClick={() => onContinue(selected)} className="focus-ring mt-2 flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary-container px-6 text-sm font-semibold text-white pink-glow hover:bg-primary-dark">Continue to payment <span>→</span></button></section>
}

function PaymentStep({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const { items: storedItems } = useCartStore()
  const hydrated = useHydrated()
  const items = hydrated ? storedItems : []
  const { handleCheckout, isSubmitting, error: checkoutError } = useCheckout()
  const [method, setMethod] = useState<PaymentMethod | 'PARTIAL'>('COD')
  const [error, setError] = useState<string | null>(null)
  const summaryItems: SummaryItem[] = items.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity, imageUrl: item.imageUrl }))

  const placeOrder = async () => {
    if (!items.length) { setError('Your cart is empty. Add a piece before placing an order.'); return }
    let selectedAddressId: string | null = null
    try { selectedAddressId = sessionStorage.getItem('checkout-address-id') } catch {}
    if (!selectedAddressId) {
      setError('Please choose a delivery address first.')
      router.push('/checkout')
      return
    }
    // COD is live; online + partial launch later.
    if (method === 'PARTIAL') { setError('Partial payment is coming soon. Please choose Cash on Delivery.'); return }
    if (method !== 'COD') { setError('Online payment is coming soon. Please choose Cash on Delivery.'); return }
    setError(null)
    await handleCheckout({ addressId: selectedAddressId, paymentMethod: method, onSuccess: (orderId) => { try { sessionStorage.removeItem('checkout-address-id') } catch {} router.push(`/order-confirmation?order=${orderId}`) } })
  }

  const methods = [
    { value: 'ONLINE' as const, title: 'Pay Online (Razorpay)', description: 'Securely pay using UPI, cards, netbanking, or wallets.', icon: CreditCard, tags: ['Coming soon'], disabled: true },
    { value: 'COD' as const, title: 'Cash on Delivery (COD)', description: 'Pay with cash when your artisanal creations arrive at your doorstep.', icon: Truck, tags: [], disabled: false },
    { value: 'PARTIAL' as const, title: 'Partial Payment', description: 'Pay 50% now to confirm your order, and the rest on delivery.', icon: PieChart, tags: ['Coming soon'], disabled: true },
  ]

  return <section className="flex flex-col gap-6"><div><p className="label-caps text-primary">Step 3 of 3</p><h1 className="mt-2 font-serif text-4xl font-semibold">Payment method</h1><p className="mt-2 text-sm text-on-surface-variant">Choose how you would like to pay for your artisanal creations.</p></div><div className="space-y-4">{methods.map(({ value, title, description, icon: Icon, tags, disabled }) => <label key={value} className={`relative block rounded-3xl border p-5 transition sm:p-6 ${disabled ? 'cursor-not-allowed border-outline-variant bg-surface-container-low opacity-60 grayscale' : 'cursor-pointer'} ${!disabled && method === value ? 'border-2 border-primary-container bg-background-soft-pink/45' : ''} ${!disabled && method !== value ? 'border-outline-variant bg-surface-container-lowest hover:border-primary-container' : ''}`}><input type="radio" name="payment" value={value} checked={method === value} onChange={() => setMethod(value)} disabled={disabled} className="sr-only" /><div className="flex items-start gap-4"><span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${!disabled && method === value ? 'border-primary-container' : 'border-outline'}`}>{!disabled && method === value ? <span className="h-3 w-3 rounded-full bg-primary-container" /> : null}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><Icon className={`h-5 w-5 ${disabled ? 'text-on-surface-variant' : 'text-primary-container'}`} /><h2 className={`font-serif text-2xl ${disabled ? 'text-on-surface-variant' : ''}`}>{title}</h2>{disabled ? <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Coming soon</span> : null}</div><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{description}</p>{tags.length ? <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-container-high pt-3">{tags.map((tag) => <span key={tag} className="rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{tag}</span>)}</div> : null}</div></div></label>)}</div>{error || checkoutError ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-error">{error || checkoutError}</p> : null}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={onBack} className="focus-ring rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary">Back to address</button><button type="button" onClick={placeOrder} disabled={isSubmitting} className="focus-ring rounded-full bg-primary-container px-8 py-3 text-sm font-semibold text-white pink-glow disabled:opacity-60">{isSubmitting ? 'Placing order...' : `Place order · ${formatPrice(summaryItems.reduce((sum, item) => sum + item.price * item.quantity, 0))}`}</button></div></section>
}

export function CheckoutPage({ step = 'address' }: { step?: 'address' | 'payment' }) {
  const router = useRouter()
  const storedCartItems = useCartStore((state) => state.items)
  const hydrated = useHydrated()
  const cartItems = hydrated ? storedCartItems : []
  const summaryItems: SummaryItem[] = cartItems.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity, imageUrl: item.imageUrl }))
  return <main className="min-h-screen bg-background-warm pt-20"><CheckoutStepper current={step} /><div className="page-track grid gap-10 pb-24 lg:grid-cols-[1.15fr_0.85fr]">{step === 'address' ? <AddressStep onContinue={(id) => { try { sessionStorage.setItem('checkout-address-id', id) } catch {} router.push('/checkout/payment') }} /> : <PaymentStep onBack={() => router.push('/checkout')} />}<div className="lg:pt-2"><OrderSummary items={summaryItems} estimated="15-20 days" /></div></div></main>
}
