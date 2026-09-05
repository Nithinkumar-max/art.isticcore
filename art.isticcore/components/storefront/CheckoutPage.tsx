'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Smartphone } from 'lucide-react'
import { AddressSchema, type AddressFormValues } from '@/lib/validations'
import { useCheckout } from '@/lib/hooks/useCheckout'
import { useHydrated } from '@/lib/hooks/useHydrated'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { CheckoutStepper, OrderSummary, type SummaryItem } from '@/components/storefront/StorefrontPrimitives'

const fields: Array<{ name: keyof AddressFormValues; label: string; placeholder: string; type?: string; full?: boolean }> = [
  { name: 'full_name', label: 'Full name', placeholder: 'Enter your full name' },
  { name: 'phone', label: 'Mobile number', placeholder: '10-digit mobile number', type: 'tel' },
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
  const queryClient = useQueryClient()
  const { data: savedAddresses = [], refetch } = useQuery<AddressVM[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await fetch('/api/account/addresses')
      if (!res.ok) return []
      const rows = (await res.json()) as Array<Record<string, unknown>>
      if (!Array.isArray(rows)) return []
      return rows.map((row) => ({
        id: String(row.id ?? ''),
        label: typeof row.label === 'string' && row.label ? row.label : 'Address',
        fullName: typeof row.full_name === 'string' ? row.full_name : '',
        phone: typeof row.phone === 'string' ? row.phone : '',
        line1: typeof row.line1 === 'string' ? row.line1 : '',
        line2: typeof row.line2 === 'string' ? row.line2 : null,
        city: typeof row.city === 'string' ? row.city : '',
        state: typeof row.state === 'string' ? row.state : '',
        pincode: typeof row.pincode === 'string' ? row.pincode : '',
      }))
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
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps text-primary">Step 2 of 3</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Delivery address</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Choose where your handmade pieces should arrive.</p>
        </div>
        <Link href="/cart" className="focus-ring mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" />Back to cart
        </Link>
      </div>

      {!savedAddresses.length && !formOpen ? (
        <div className="surface-card p-5 text-sm text-on-surface-variant">No saved addresses yet — add one below to continue.</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {savedAddresses.map((address) => (
          <label key={address.id} className={`surface-card relative cursor-pointer p-5 transition hover:border-primary-container ${selected === address.id ? 'border-2 border-primary' : 'opacity-80'}`}>
            <input type="radio" name="address" checked={selected === address.id} onChange={() => setSelected(address.id)} className="sr-only" />
            <div className="flex items-start justify-between">
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selected === address.id ? 'bg-background-soft-pink text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{address.label}</span>
              {selected === address.id ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"><Check className="h-3.5 w-3.5" /></span> : null}
            </div>
            <h2 className="mt-4 font-serif text-xl font-semibold">{address.fullName}</h2>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{address.line1}<br />{address.city}, {address.state} · {address.pincode}</p>
            <p className="mt-3 text-sm text-on-surface-variant">{address.phone}</p>
          </label>
        ))}
      </div>

      <button type="button" onClick={() => setFormOpen(!formOpen)} className="focus-ring inline-flex items-center gap-2 self-start rounded-full border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary">
        {formOpen ? 'Cancel' : '+ Add new address'}
      </button>

      {formOpen ? (
        <form onSubmit={handleSubmit(submitNewAddress)} className="surface-card grid gap-4 p-5 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.full ? 'md:col-span-2' : ''}>
              <label className="mb-1 block text-xs font-semibold text-on-surface-variant">{f.label}</label>
              <input {...register(f.name)} type={f.type} placeholder={f.placeholder} className="focus-ring w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
              <FieldError message={errors[f.name]?.message} />
            </div>
          ))}
          {addressError ? <p className="md:col-span-2 text-sm text-error">{addressError}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={savingAddress} className="focus-ring rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {savingAddress ? 'Saving...' : 'Save address'}
            </button>
          </div>
        </form>
      ) : null}

      {savedAddresses.length > 0 ? (
        <button type="button" onClick={() => { if (selected) onContinue(selected) }} disabled={!selected} className="focus-ring self-end rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50">
          Continue to payment
        </button>
      ) : null}
    </section>
  )
}

function PaymentStep({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const { items: storedItems } = useCartStore()
  const hydrated = useHydrated()
  const items = hydrated ? storedItems : []
  const { handleCheckout, isSubmitting, error: checkoutError } = useCheckout()
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
    setError(null)
    await handleCheckout({ addressId: selectedAddressId, paymentMethod: 'razorpay', onSuccess: (orderId) => { try { sessionStorage.removeItem('checkout-address-id') } catch {} router.push(`/order-confirmation?order=${orderId}`) } })
  }

  return <section className="flex flex-col gap-6"><div className="flex items-start justify-between gap-4"><div><p className="label-caps text-primary">Step 3 of 3</p><h1 className="mt-2 font-serif text-4xl font-semibold">Payment</h1><p className="mt-2 text-sm text-on-surface-variant">Pay securely with UPI through Razorpay.</p></div><button type="button" onClick={onBack} className="focus-ring mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Back to address</button></div><label className="relative block cursor-pointer rounded-3xl border-2 border-primary-container bg-background-soft-pink/45 p-5 sm:p-6"><input type="radio" name="payment" value="UPI" checked readOnly className="sr-only" aria-label="Pay with UPI via Razorpay" /><div className="flex items-start gap-4"><span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary-container"><span className="h-3 w-3 rounded-full bg-primary-container" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><Smartphone className="h-5 w-5 text-primary-container" /><h2 className="font-serif text-2xl">UPI</h2></div><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Pay instantly with any UPI app — GPay, PhonePe, Paytm and more — via our secure Razorpay checkout.</p></div></div></label>{error || checkoutError ? <p role="alert" className="rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-error">{error || checkoutError}</p> : null}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={onBack} className="focus-ring rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary">Back to address</button><button type="button" onClick={placeOrder} disabled={isSubmitting} className="focus-ring rounded-full bg-primary-container px-8 py-3 text-sm font-semibold text-white pink-glow disabled:opacity-60">{isSubmitting ? 'Placing order...' : `Pay & place order \u2014 ${formatPrice(summaryItems.reduce((sum, item) => sum + item.price * item.quantity, 0))}`}</button></div></section>
}

export function CheckoutPage({ step = 'address' }: { step?: 'address' | 'payment' }) {
  const router = useRouter()
  const storedCartItems = useCartStore((state) => state.items)
  const hydrated = useHydrated()
  const cartItems = hydrated ? storedCartItems : []
  const summaryItems: SummaryItem[] = cartItems.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity, imageUrl: item.imageUrl }))
  return (
    <main className="min-h-screen bg-background-warm pt-20">
      <CheckoutStepper current={step} />
      <div className="page-track grid gap-10 pb-24 lg:grid-cols-[1.15fr_0.85fr]">
        {step === 'address' ? (
          <AddressStep onContinue={(id) => { try { sessionStorage.setItem('checkout-address-id', id) } catch {} router.push('/checkout/payment') }} />
        ) : (
          <PaymentStep onBack={() => router.push('/checkout')} />
        )}
        <div className="lg:pt-2">
          <OrderSummary items={summaryItems} estimated="15-20 days" />
        </div>
      </div>
    </main>
  )
}
