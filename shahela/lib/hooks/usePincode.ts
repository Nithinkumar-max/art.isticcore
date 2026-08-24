'use client'

import { useState, useCallback } from 'react'
import type { PincodeCheckResult } from '@/lib/services/pincodes'

export function usePincode() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PincodeCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPincode = useCallback(async (pincode: string) => {
    if (!pincode || pincode.trim().length !== 6) {
      setError('Please enter a 6-digit pincode')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/pincode/check?pincode=${pincode.trim()}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to check pincode')

      setResult(data)
      return data as PincodeCheckResult
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error verifying pincode'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const joinWaitlist = useCallback(
    async ({
      pincode,
      email,
      phone,
      city,
      state,
    }: {
      pincode: string
      email?: string
      phone?: string
      city?: string
      state?: string
    }) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/pincode/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pincode, email, phone, city, state }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to join waitlist')
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error joining waitlist'
        setError(msg)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    checkPincode,
    joinWaitlist,
    loading,
    result,
    error,
  }
}
