'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { ArtistCartGroup } from '@/utilities/cartGroups'
import {
  CART_ID_STORAGE_KEY,
  CART_SECRET_STORAGE_KEY,
  readCartStorage,
  useCartSummary,
} from '@/components/Cart/useCartSummary'
import { formatCOP } from '@/utilities/money'
import { ArtistGroupCard, type GroupPaymentState, SettledGroupCard } from './ArtistGroupCard'
import {
  type CheckoutContactForm,
  emptyContact,
  getMissingContactFields,
  ShippingDetails,
} from './ShippingDetails'

const CONTACT_STORAGE_KEY = 'oddsound-checkout-contact'
const PENDING_STORAGE_KEY = 'oddsound-checkout-pending'

const SETTLE_ATTEMPTS = 6
const SETTLE_INTERVAL_MS = 1500

type SettledGroup = {
  avatarURL: null | string
  profileID: string
  profileName: string
  totalCOP: number
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const CartClient: React.FC = () => {
  const { cart, decrementItem, incrementItem, refreshCart, removeItem } = useCart()
  const { isLoading, refresh: refreshSummary, summary } = useCartSummary()

  const [contact, setContact] = useState<CheckoutContactForm>(emptyContact)
  const [hydrated, setHydrated] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [groupStates, setGroupStates] = useState<Record<string, GroupPaymentState>>({})
  const [settled, setSettled] = useState<SettledGroup[]>([])
  const [notice, setNotice] = useState<null | string>(null)
  const returnHandled = useRef(false)

  const requiresShipping = summary.groups.some((group) => group.totals.shippingCOP > 0)

  const setGroupState = useCallback((profileID: string, state: GroupPaymentState) => {
    setGroupStates((current) => ({ ...current, [profileID]: state }))
  }, [])

  // Remembering the buyer's details across the several round trips to Mercado
  // Pago is the difference between one form and one form per artist.
  useEffect(() => {
    const stored = readCartStorage(CONTACT_STORAGE_KEY)

    if (stored) {
      try {
        setContact({ ...emptyContact, ...(JSON.parse(stored) as CheckoutContactForm) })
      } catch {
        // A corrupt draft is not worth surfacing; the form just starts empty.
      }
    }

    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    try {
      window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact))
    } catch {
      // Private browsing. The form still works for this visit.
    }
  }, [contact, hydrated])

  /**
   * Reconciles a return trip from Mercado Pago.
   *
   * Landing back here is not proof of payment, so the cart is only emptied once
   * the server confirms the order is complete — which happens when the webhook
   * arrives, usually within seconds. Until then the items stay put.
   */
  const reconcileReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    const orderID = params.get('order')

    if (!orderID) return

    let pending: null | SettledGroup = null

    try {
      const raw = readCartStorage(PENDING_STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as { order: SettledGroup; orderID: string }) : null

      if (parsed?.orderID === orderID) pending = parsed.order
    } catch {
      pending = null
    }

    window.history.replaceState({}, '', '/cart')

    const profileID = pending?.profileID || ''

    if (payment === 'failed') {
      if (profileID) setGroupState(profileID, 'failed')

      return
    }

    if (profileID) setGroupState(profileID, 'starting')

    const cartID = readCartStorage(CART_ID_STORAGE_KEY)
    const cartSecret = readCartStorage(CART_SECRET_STORAGE_KEY)

    for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch('/creator-api/checkout/settle', {
          body: JSON.stringify({ cartID, cartSecret, orderID }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        const data = (await response.json()) as { orderStatus?: string; settled?: boolean }

        if (data.settled) {
          if (pending) setSettled((current) => [...current, pending])
          if (profileID) setGroupState(profileID, 'paid')

          try {
            window.localStorage.removeItem(PENDING_STORAGE_KEY)
          } catch {
            // Nothing to clean up.
          }

          await refreshCart()
          await refreshSummary()

          return
        }

        if (data.orderStatus === 'cancelled' || data.orderStatus === 'refunded') {
          if (profileID) setGroupState(profileID, 'failed')

          return
        }
      } catch {
        // Network hiccup: fall through to the next attempt.
      }

      await wait(SETTLE_INTERVAL_MS)
    }

    // The webhook has not landed yet. Leaving the items in the cart while
    // showing the group as pending is the honest state — and safer than
    // emptying a cart for a payment that might still fail.
    if (profileID) setGroupState(profileID, 'pending')
  }, [refreshCart, refreshSummary, setGroupState])

  useEffect(() => {
    if (returnHandled.current) return

    returnHandled.current = true
    void reconcileReturn()
  }, [reconcileReturn])

  const handlePay = useCallback(
    async (group: ArtistCartGroup) => {
      const missing = getMissingContactFields(contact, {
        requiresShipping: group.totals.shippingCOP > 0,
      })

      if (missing.length > 0) {
        setShowErrors(true)
        setNotice('Completa tus datos para continuar con el pago.')
        document.getElementById('cart-contact')?.scrollIntoView({ behavior: 'smooth' })

        return
      }

      setNotice(null)
      setGroupState(group.profileID, 'starting')

      const cartID = readCartStorage(CART_ID_STORAGE_KEY) || (cart?.id ? String(cart.id) : null)
      const cartSecret = readCartStorage(CART_SECRET_STORAGE_KEY)

      try {
        const response = await fetch('/creator-api/checkout/group', {
          body: JSON.stringify({
            cartID,
            cartSecret,
            contact,
            profileID: group.profileID,
          }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        const data = (await response.json()) as {
          initPoint?: string
          message?: string
          orderID?: string
        }

        if (!response.ok || !data.initPoint || !data.orderID) {
          setGroupState(group.profileID, 'failed')
          setNotice(data.message || 'No pudimos iniciar el pago. Inténtalo de nuevo.')

          return
        }

        // Stashed so the return trip knows which card to mark as paid, even
        // after its items have left the cart.
        try {
          window.localStorage.setItem(
            PENDING_STORAGE_KEY,
            JSON.stringify({
              order: {
                avatarURL: group.avatarURL,
                profileID: group.profileID,
                profileName: group.profileName,
                totalCOP: group.totals.totalCOP,
              },
              orderID: data.orderID,
            }),
          )
        } catch {
          // Without it the payment still works; the paid card just will not
          // linger after the items are removed.
        }

        window.location.assign(data.initPoint)
      } catch {
        setGroupState(group.profileID, 'failed')
        setNotice('No pudimos conectar con Mercado Pago. Inténtalo de nuevo.')
      }
    },
    [cart?.id, contact, setGroupState],
  )

  const settledIDs = new Set(settled.map((entry) => entry.profileID))
  const visibleGroups = summary.groups.filter((group) => !settledIDs.has(group.profileID))
  const pendingTotal = visibleGroups
    .filter((group) => group.canCheckout)
    .reduce((sum, group) => sum + group.totals.totalCOP, 0)
  const pendingPayments = visibleGroups.filter((group) => group.canCheckout).length

  if (isLoading && !cart) {
    return <p className="py-16 text-center text-[13px] text-muted-foreground">Cargando tu carrito…</p>
  }

  if (visibleGroups.length === 0 && settled.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 px-4 py-3 text-[13px] leading-5 text-rose-700 dark:text-rose-300"
          role="alert"
        >
          {notice}
        </p>
      ) : null}

      {settled.map((entry) => (
        <SettledGroupCard
          avatarURL={entry.avatarURL}
          key={entry.profileID}
          profileName={entry.profileName}
          totalCOP={entry.totalCOP}
        />
      ))}

      {visibleGroups.length > 0 ? (
        <div id="cart-contact">
          <ShippingDetails
            contact={contact}
            highlightMissing={showErrors}
            onChange={setContact}
            requiresShipping={requiresShipping}
          />
        </div>
      ) : null}

      <div className="space-y-5">
        {visibleGroups.map((group) => (
          <ArtistGroupCard
            group={group}
            key={group.profileID || group.profileName}
            onDecrement={(itemID) => void decrementItem(itemID)}
            onIncrement={(itemID) => void incrementItem(itemID)}
            onPay={handlePay}
            onRemove={(itemID) => void removeItem(itemID)}
            state={groupStates[group.profileID] || 'idle'}
          />
        ))}
      </div>

      {pendingPayments > 0 ? <CartFooter payments={pendingPayments} total={pendingTotal} /> : null}
    </div>
  )
}

/**
 * The running total, always shown next to how many separate payments it covers.
 *
 * There is deliberately no button here: the only way to pay is inside an
 * artist's card, which is what makes the split self-evident.
 */
function CartFooter({ payments, total }: { payments: number; total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border bg-card px-5 py-4">
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: Math.min(payments, 6) }).map((_, index) => (
          <span className="size-2.5 rounded-full bg-primary dark:bg-card" key={index} />
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground">
        {payments} {payments === 1 ? 'pago' : 'pagos'} por separado
      </p>
      <p className="text-[16px] font-medium tabular-nums text-foreground">{formatCOP(total)}</p>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="rounded-[28px] border border-dashed border-border px-6 py-16 text-center">
      <p className="text-[15px] text-foreground">Tu carrito está vacío.</p>
      <p className="mx-auto mt-2 max-w-[26rem] text-[13px] leading-6 text-muted-foreground">
        El merch vive en el perfil de cada artista.
      </p>
      <Link
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-[13px] font-medium text-primary-foreground transition hover:opacity-90"
        href="/search"
      >
        Explorar artistas
      </Link>
    </div>
  )
}
