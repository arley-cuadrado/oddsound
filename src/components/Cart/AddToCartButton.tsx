'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

type AddToCartButtonProps = {
  className?: string
  label?: string
  productID: string
  openCheckout?: boolean
}

const CONFIRMATION_MS = 2200

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  className,
  label = 'Agregar al carrito',
  productID,
  openCheckout = false,
}) => {
  const router = useRouter()
  const { addItem, cart, isLoading } = useCart()
  const [expectedQuantity, setExpectedQuantity] = useState<null | number>(null)
  const [requestFailed, setRequestFailed] = useState(false)
  const [requestPending, setRequestPending] = useState(false)

  const currentQuantity = (cart?.items || []).reduce((total, item) => {
    const product = item.product
    const itemProductID = typeof product === 'object' && product ? product.id : product

    return String(itemProductID) === productID ? total + (item.quantity || 0) : total
  }, 0)

  const state =
    expectedQuantity === null
      ? 'idle'
      : currentQuantity >= expectedQuantity
        ? 'added'
        : requestFailed || (!isLoading && !requestPending)
          ? 'failed'
          : 'idle'

  useEffect(() => {
    if (state === 'idle' || requestPending) return

    if (state === 'added' && openCheckout) {
      router.push('/cart')
      return
    }

    const timer = setTimeout(() => {
      setExpectedQuantity(null)
      setRequestFailed(false)
    }, CONFIRMATION_MS)

    return () => clearTimeout(timer)
  }, [openCheckout, requestPending, router, state])

  const handleClick = async () => {
    if (isLoading || requestPending) return

    setRequestPending(true)
    setRequestFailed(false)
    setExpectedQuantity(currentQuantity + 1)

    try {
      await addItem({ product: productID }, 1)
    } catch {
      setRequestFailed(true)
    } finally {
      setRequestPending(false)
    }
  }

  return (
    <button
      aria-live="polite"
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-medium transition disabled:opacity-60',
        state === 'added'
          ? 'bg-emerald-600 text-white'
          : state === 'failed'
            ? 'bg-rose-700 text-white'
            : 'bg-primary text-primary-foreground hover:opacity-90',
        className,
      )}
      disabled={isLoading || requestPending}
      onClick={handleClick}
      type="button"
    >
      {requestPending ? (
        'Agregando…'
      ) : state === 'added' ? (
        <>
          <CheckIcon />
          En el carrito
        </>
      ) : state === 'failed' ? (
        'Inténtalo de nuevo'
      ) : (
        label
      )}
    </button>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 16 16" width="14">
      <path
        d="M3 8.5 6.2 12 13 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}
