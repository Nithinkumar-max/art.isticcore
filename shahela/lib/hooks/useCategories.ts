'use client'

import { useQuery } from '@tanstack/react-query'
import type { Category, CategorySection } from '@/types'

export function useCategories(section?: CategorySection, initialData?: Category[]) {
  return useQuery<Category[]>({
    queryKey: ['categories', section],
    queryFn: async () => {
      const url = section ? `/api/categories?section=${section}` : '/api/categories'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load categories')
      return res.json()
    },
    initialData,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
