'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const FLAG = 'just-logged-out'

/** Shows a "Successfully logged out" confirmation once after logout redirect. */
export function LogoutToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(FLAG) === '1') {
        sessionStorage.removeItem(FLAG)
        setVisible(true)
        const timer = window.setTimeout(() => setVisible(false), 3500)
        return () => window.clearTimeout(timer)
      }
    } catch {
      // storage unavailable — skip silently
    }
  }, [])

  if (!visible) return null
  return (
    <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 md:bottom-8">
      <p className="flex items-center gap-2 rounded-full bg-[#0f5132] px-5 py-3 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="h-4 w-4" />
        Successfully logged out
      </p>
    </div>
  )
}
