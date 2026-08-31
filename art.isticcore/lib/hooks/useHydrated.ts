'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true after the first client effect, so persisted browser state can
 * be rendered without changing the server/client hydration snapshot.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}
