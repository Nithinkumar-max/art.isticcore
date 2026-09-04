'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import type { CartItemClient } from '@/types'

const cartStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(name) ?? window.localStorage.getItem('artisticcore-cart') ?? window.localStorage.getItem('artisticcore-cart')
  },
  setItem: (name, value) => {
    window.localStorage.setItem(name, value)
  },
  removeItem: (name) => {
    window.localStorage.removeItem(name)
    window.localStorage.removeItem('artisticcore-cart')
    window.localStorage.removeItem('artisticcore-cart')
  },
}

interface CartState {
  items: CartItemClient[]
  isOpen: boolean
  addItem: (item: CartItemClient) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateNote: (itemId: string, note: string) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  itemCount: () => number
  subtotal: () => number
  maxLeadTime: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find(
            (item) => item.productId === newItem.productId
          )

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === newItem.productId
                  ? { ...item, quantity: Math.min(item.quantity + newItem.quantity, 10) }
                  : item
              ),
              isOpen: true,
            }
          }

          return { items: [...state.items, newItem], isOpen: true }
        })
      },

      removeItem: (itemId) => set((state) => ({ items: state.items.filter((item) => item.id !== itemId) })),

      updateQuantity: (itemId, quantity) => {
        if (quantity < 1) {
          get().removeItem(itemId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity: Math.min(quantity, 10) } : item
          ),
        }))
      },

      updateNote: (itemId, note) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === itemId ? { ...item, customNote: note } : item)),
        })),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      maxLeadTime: () => get().items.reduce((max, item) => Math.max(max, item.leadTimeDays), 0),
    }),
    {
      name: 'artisticcore-cart',
      storage: createJSONStorage(() => cartStorage),
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<CartState>),
        isOpen: false,
      }),
      version: 2,
      // Never wipe a populated cart during a version bump — carry whatever
      // items were persisted over (shape has been `{ items }` since v1).
      migrate: (persistedState) => {
        const current = (persistedState as { items?: CartItemClient[] } | undefined) ?? {}
        return { items: Array.isArray(current.items) ? current.items : [] }
      },
    }
  )
)
