'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { useCallback, useEffect, useState } from 'react'

import type { CartSummary } from '@/utilities/cartGroups'

/** Keys owned by the ecommerce plugin's `syncLocalStorage`. */
export const CART_ID_STORAGE_KEY = 'cart'
export const CART_SECRET_STORAGE_KEY = 'cart_secret'

export function readCartStorage(key: string): null | string {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const emptySummary: CartSummary = {
  artistCount: 0,
  groups: [],
  itemCount: 0,
  payableGroupCount: 0,
  totalCOP: 0,
}

/**
 * The cart grouped by artist, fetched from the server.
 *
 * It re-runs whenever the plugin's cart changes, using `updatedAt` as the
 * signal — every add, increment and removal bumps it.
 */
export function useCartSummary() {
  const { cart, isLoading: cartIsLoading } = useCart()
  const [summary, setSummary] = useState<CartSummary>(emptySummary)
  const [isLoading, setIsLoading] = useState(true)

  const cartRevision = cart?.updatedAt || ''
  const itemCount = (cart?.items || []).length

  const refresh = useCallback(async () => {
    const cartID = readCartStorage(CART_ID_STORAGE_KEY) || (cart?.id ? String(cart.id) : null)

    if (!cartID) {
      setSummary(emptySummary)
      setIsLoading(false)

      return
    }

    const params = new URLSearchParams({ cart: cartID })
    const secret = readCartStorage(CART_SECRET_STORAGE_KEY)

    if (secret) params.set('secret', secret)

    try {
      const response = await fetch(`/creator-api/cart/summary?${params.toString()}`, {
        credentials: 'include',
      })

      setSummary(response.ok ? ((await response.json()) as CartSummary) : emptySummary)
    } catch {
      setSummary(emptySummary)
    } finally {
      setIsLoading(false)
    }
  }, [cart])

  useEffect(() => {
    const refreshTimeout = window.setTimeout(() => {
      void refresh()
    }, 0)

    return () => window.clearTimeout(refreshTimeout)
  }, [cartRevision, itemCount, refresh])

  return { isLoading: isLoading || cartIsLoading, refresh, summary }
}
