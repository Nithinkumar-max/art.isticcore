'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

const authStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(name) ?? window.localStorage.getItem('artisticcore-auth') ?? window.localStorage.getItem('artisticcore-auth')
  },
  setItem: (name, value) => window.localStorage.setItem(name, value),
  removeItem: (name) => {
    window.localStorage.removeItem(name)
    window.localStorage.removeItem('artisticcore-auth')
    window.localStorage.removeItem('artisticcore-auth')
  },
}

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isLoading: false }),
      isAdmin: () => {
        const role = get().user?.role
        return role === 'ADMIN' || role === 'SUPER_ADMIN'
      },
    }),
    {
      name: 'artisticcore-auth',
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({ user: state.user }),
      version: 1,
    }
  )
)
