'use client'

import Link from 'next/link'
import React from 'react'

import type { ArtistCartGroup } from '@/utilities/cartGroups'
import { formatCOP } from '@/utilities/money'
import { cn } from '@/utilities/ui'

export type GroupPaymentState = 'failed' | 'idle' | 'paid' | 'pending' | 'starting'

type ArtistGroupCardProps = {
  group: ArtistCartGroup
  onDecrement: (itemID: string) => void
  onIncrement: (itemID: string) => void
  onPay: (group: ArtistCartGroup) => void
  onRemove: (itemID: string) => void
  state: GroupPaymentState
}

/**
 * One artist, one payment.
 *
 * The card is self-contained on purpose: its own items, its own total and its
 * own pay button, with no global "pay everything" anywhere on the page. That
 * absence is what tells a shopper the cart settles once per artist, without a
 * paragraph explaining Mercado Pago's split.
 */
export const ArtistGroupCard: React.FC<ArtistGroupCardProps> = ({
  group,
  onDecrement,
  onIncrement,
  onPay,
  onRemove,
  state,
}) => {
  const { totals } = group
  const blocked = !group.canCheckout
  const settled = state === 'paid'

  if (settled) {
    return (
      <SettledGroupCard
        avatarURL={group.avatarURL}
        profileName={group.profileName}
        totalCOP={totals.totalCOP}
      />
    )
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[24px] border bg-card',
        blocked
          ? 'border-dashed border-border opacity-75'
          : 'border-border shadow-[0_18px_60px_rgba(49,46,46,0.06)]',
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Avatar name={group.profileName} url={group.avatarURL} />

        <div className="min-w-0 flex-1">
          {group.profileSlug ? (
            <Link
              className="block truncate text-[15px] font-medium text-foreground hover:underline"
              href={`/${group.profileSlug}/shop`}
            >
              {group.profileName}
            </Link>
          ) : (
            <p className="truncate text-[15px] font-medium text-foreground">{group.profileName}</p>
          )}
          {group.shippingNotes ? (
            <p className="truncate text-[12px] text-muted-foreground">{group.shippingNotes}</p>
          ) : null}
        </div>
      </header>

      <ul className="divide-y divide-border">
        {group.items.map((item) => (
          <li className="flex items-center gap-4 px-5 py-4" key={item.id}>
            <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.imageURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  loading="lazy"
                  src={item.imageURL}
                />
              ) : null}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-foreground">{item.title}</p>
              <p className="text-[12px] text-muted-foreground">
                {formatCOP(item.unitPriceCOP)} c/u
                {item.releaseTitle ? ` · ${item.releaseTitle}` : ''}
              </p>

              <div className="mt-2 flex items-center gap-3">
                <QuantityStepper
                  onDecrement={() => onDecrement(item.id)}
                  onIncrement={() => onIncrement(item.id)}
                  quantity={item.quantity}
                />
                <button
                  className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  Quitar
                </button>
              </div>
            </div>

            <p className="text-[14px] font-medium tabular-nums text-foreground">
              {formatCOP(item.lineTotalCOP)}
            </p>
          </li>
        ))}
      </ul>

      {/* Amount and action sit in one filled band so they read as a single
          transaction rather than a running subtotal of the page. */}
      <footer className="space-y-3 bg-muted px-5 py-4">
        <dl className="space-y-1 text-[13px] text-muted-foreground">
          <div className="flex justify-between">
            <dt>Productos</dt>
            <dd className="tabular-nums">{formatCOP(totals.subtotalCOP)}</dd>
          </div>
          {totals.shippingCOP > 0 ? (
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd className="tabular-nums">{formatCOP(totals.shippingCOP)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between pt-1 text-[15px] font-medium text-foreground">
            <dt>Total de este pago</dt>
            <dd className="tabular-nums">{formatCOP(totals.totalCOP)}</dd>
          </div>
        </dl>

        {blocked ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-[12px] leading-5 text-muted-foreground">
            {group.blockedReason === 'unavailable'
              ? 'Estos productos ya no están disponibles.'
              : `${group.profileName} aún no recibe pagos.`}
          </p>
        ) : (
          <>
            <button
              className={cn(
                'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-medium text-primary-foreground transition disabled:opacity-70',
                state === 'failed' ? 'bg-rose-700' : 'bg-primary hover:opacity-90',
              )}
              disabled={state === 'starting' || state === 'pending'}
              onClick={() => onPay(group)}
              type="button"
            >
              {state === 'starting'
                ? 'Abriendo Mercado Pago…'
                : state === 'pending'
                  ? 'Pago en proceso'
                  : state === 'failed'
                    ? `Reintentar el pago a ${group.profileName}`
                    : `Pagar a ${group.profileName}`}
            </button>

            {state === 'pending' ? (
              <p className="text-center text-[12px] leading-5 text-muted-foreground">
                Mercado Pago está confirmando el pago.
              </p>
            ) : null}
            {state === 'failed' ? (
              <p className="text-center text-[12px] leading-5 text-rose-700 dark:text-rose-300">
                El pago no se completó. Tus productos siguen en el carrito.
              </p>
            ) : null}
          </>
        )}
      </footer>
    </article>
  )
}

/**
 * A group that has been paid for.
 *
 * It stays on the page after its items leave the cart, so the shopper keeps
 * seeing which artists are settled and which still owe a payment.
 */
export const SettledGroupCard: React.FC<{
  avatarURL: null | string
  profileName: string
  totalCOP: number
}> = ({ avatarURL, profileName, totalCOP }) => (
  <article className="flex items-center gap-4 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
      <CheckIcon />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[14px] font-medium text-foreground">{profileName}</p>
      <p className="text-[12px] text-muted-foreground">Pago confirmado</p>
    </div>
    <p className="text-[14px] font-medium tabular-nums text-foreground">{formatCOP(totalCOP)}</p>
    <Avatar name={profileName} url={avatarURL} />
  </article>
)

function Avatar({ name, url }: { name: string; url: null | string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[13px] font-semibold uppercase text-muted-foreground">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" decoding="async" loading="lazy" src={url} />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  )
}

function QuantityStepper({
  onDecrement,
  onIncrement,
  quantity,
}: {
  onDecrement: () => void
  onIncrement: () => void
  quantity: number
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-border">
      <button
        aria-label="Quitar una unidad"
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        onClick={onDecrement}
        type="button"
      >
        −
      </button>
      <span className="min-w-6 text-center text-[13px] tabular-nums">{quantity}</span>
      <button
        aria-label="Agregar una unidad"
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        onClick={onIncrement}
        type="button"
      >
        +
      </button>
    </span>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
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
