'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import React, { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

type AddToCartButtonProps = {
  className?: string
  label?: string
  productID: string
  /** Set when the artist cannot take payments yet, so the shop shows a state
   *  instead of a button that would fail. */
  unavailable?: boolean
}

const CONFIRMATION_MS = 2200

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  className,
  label = 'Agregar al carrito',
  productID,
  unavailable = false,
}) => {
  const { addItem, isLoading } = useCart()
  const [state, setState] = useState<'added' | 'failed' | 'idle'>('idle')

  useEffect(() => {
    if (state === 'idle') return

    const timer = setTimeout(() => setState('idle'), CONFIRMATION_MS)

    return () => clearTimeout(timer)
  }, [state])

  if (unavailable) {
    return (
      <span
        className={cn(
          'inline-flex h-11 items-center justify-center rounded-full border border-dashed border-border px-5 text-[13px] font-medium text-muted-foreground dark:border-white/15 dark:text-primary-foreground/50',
          className,
        )}
      >
        Próximamente
      </span>
    )
  }

  const handleClick = async () => {
    try {
      await addItem({ product: productID }, 1)
      setState('added')
    } catch {
      setState('failed')
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
      disabled={isLoading}
      onClick={handleClick}
      type="button"
    >
      {state === 'added' ? (
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
