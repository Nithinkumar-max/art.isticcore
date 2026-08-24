'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import type { PaymentMethod } from '@/types'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function useCheckout() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { items, clearCart } = useCartStore()
  const { user } = useAuthStore()

  const handleCheckout = async ({
    addressId,
    paymentMethod,
    customerNote,
    onSuccess,
  }: {
    addressId: string
    paymentMethod: PaymentMethod
    customerNote?: string
    onSuccess?: (orderId: string) => void
  }) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (items.length === 0) {
        throw new Error('Your cart is empty')
      }

      // 1. Create order on server
      const createRes = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId,
          paymentMethod,
          customerNote,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId || null,
            quantity: i.quantity,
            customNote: i.customNote || null,
          })),
        }),
      })

      const orderData = await createRes.json()
      if (!createRes.ok) {
        throw new Error(orderData.error || 'Failed to place order')
      }

      const { order, razorpayOrderId, razorpayKeyId } = orderData

      // 2. Handle COD
      if (paymentMethod === 'COD') {
        clearCart()
        if (onSuccess) onSuccess(order.id)
        router.push(`/orders/${order.id}`)
        return
      }

      // 3. Handle Razorpay
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Could not load payment gateway. Please check your internet connection.')
      }

      const options = {
        key: razorpayKeyId,
        amount: Math.round(order.total * 100),
        currency: 'INR',
        name: 'Art.isticcore',
        description: `Order #${order.order_number}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#991b1b',
        },
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          try {
            const verifyRes = await fetch('/api/checkout/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed')
            }

            clearCart()
            if (onSuccess) onSuccess(order.id)
            router.push(`/orders/${order.id}`)
          } catch (verifyErr: unknown) {
            const msg = verifyErr instanceof Error ? verifyErr.message : 'Verification failed'
            setError(msg)
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed'
      setError(msg)
      setIsSubmitting(false)
    }
  }

  return {
    handleCheckout,
    isSubmitting,
    error,
  }
}
