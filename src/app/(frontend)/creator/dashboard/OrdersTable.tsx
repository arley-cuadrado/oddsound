'use client'

import React, { useState } from 'react'

import type { ArtistOrderSummary } from '@/utilities/commerceOrders'
import { formatCOP } from '@/utilities/money'
import { cn } from '@/utilities/ui'
import { panelCard, panelEyebrow, panelInset, panelTitle, primaryButton, secondaryButton } from './ui'

const fulfillmentCopy: Record<ArtistOrderSummary['fulfillmentStatus'], { label: string; tone: string }> =
  {
    cancelled: { label: 'Cancelado', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
    delivered: { label: 'Entregado', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
    not_required: { label: 'Digital', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
    pending_payment: { label: 'Pendiente de pago', tone: 'bg-muted text-muted-foreground' },
    ready_to_ship: { label: 'Por enviar', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
    refunded: { label: 'Reembolsado', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
    shipped: { label: 'Enviado', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
  }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))
}

/**
 * The artist's sales, with the next action attached to each row.
 *
 * A "por enviar" order is a task, not a record, so the button that resolves it
 * lives on the row rather than behind a trip to the CMS.
 */
export const OrdersTable: React.FC<{ orders: ArtistOrderSummary[] }> = ({ orders: initial }) => {
  const [orders, setOrders] = useState(initial)
  const [openRow, setOpenRow] = useState<null | string>(null)
  const [busy, setBusy] = useState<null | string>(null)

  if (orders.length === 0) {
    return (
      <section className={cn(panelCard, 'space-y-4')}>
        <div className="space-y-1">
          <p className={panelEyebrow}>Pedidos</p>
          <h2 className={panelTitle}>Tus ventas</h2>
        </div>
        <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
          <p className="text-[14px] text-foreground">Todavía no tienes ventas.</p>
          <p className="mx-auto mt-1 max-w-[30rem] text-[12px] leading-5 text-muted-foreground">
            Aquí verás tus pedidos y sus envíos.
          </p>
        </div>
      </section>
    )
  }

  const advance = async (order: ArtistOrderSummary, next: 'delivered' | 'shipped', extra?: {
    carrierName?: string
    trackingNumber?: string
  }) => {
    setBusy(order.id)

    try {
      const response = await fetch('/creator-api/commerce/fulfillment', {
        body: JSON.stringify({ ...extra, fulfillmentStatus: next, orderID: order.id }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (response.ok) {
        const data = (await response.json()) as { order: Partial<ArtistOrderSummary> }

        setOrders((current) =>
          current.map((entry) => (entry.id === order.id ? { ...entry, ...data.order } : entry)),
        )
        setOpenRow(null)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={cn(panelCard, 'space-y-4')}>
      <div className="space-y-1">
        <p className={panelEyebrow}>Pedidos</p>
        <h2 className={panelTitle}>Tus ventas</h2>
      </div>

      <ul className="divide-y divide-border">
        {orders.map((order) => {
          const chip = fulfillmentCopy[order.fulfillmentStatus]
          const expanded = openRow === order.id

          return (
            <li className="py-4" key={order.id}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className={cn('rounded-full px-3 py-1 text-[11px] font-medium', chip.tone)}>
                  {chip.label}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-foreground">
                    {order.buyerName || order.buyerEmail || 'Comprador'}
                    {order.city ? ` · ${order.city}` : ''}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {formatDate(order.createdAt)} · {order.itemCount}{' '}
                    {order.itemCount === 1 ? 'producto' : 'productos'}
                    {order.trackingNumber ? ` · Guía ${order.trackingNumber}` : ''}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[14px] font-medium tabular-nums text-foreground">
                    {formatCOP(order.netCOP)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">de {formatCOP(order.totalCOP)}</p>
                </div>

                {order.fulfillmentStatus === 'ready_to_ship' ? (
                  <button
                    className={cn(primaryButton, 'h-9 rounded-full px-4 text-[12px]')}
                    disabled={busy === order.id}
                    onClick={() => setOpenRow(expanded ? null : order.id)}
                    type="button"
                  >
                    Marcar enviado
                  </button>
                ) : order.fulfillmentStatus === 'shipped' ? (
                  <button
                    className={cn(secondaryButton, 'h-9 rounded-full px-4 text-[12px]')}
                    disabled={busy === order.id}
                    onClick={() => void advance(order, 'delivered')}
                    type="button"
                  >
                    Marcar entregado
                  </button>
                ) : null}
              </div>

              {expanded ? <ShipForm busy={busy === order.id} onSubmit={(values) => void advance(order, 'shipped', values)} /> : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ShipForm({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (values: { carrierName: string; trackingNumber: string }) => void
}) {
  const [carrierName, setCarrierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  return (
    <div className={cn(panelInset, 'mt-3 flex flex-wrap items-end gap-3 py-3')}>
      <label className="flex-1 space-y-1 text-[11px] text-muted-foreground">
        Transportadora
        <input
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground"
          onChange={(event) => setCarrierName(event.target.value)}
          value={carrierName}
        />
      </label>
      <label className="flex-1 space-y-1 text-[11px] text-muted-foreground">
        Número de guía
        <input
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground"
          onChange={(event) => setTrackingNumber(event.target.value)}
          value={trackingNumber}
        />
      </label>
      <button
        className={cn(primaryButton, 'h-10 px-4 text-[12px]')}
        disabled={busy}
        onClick={() => onSubmit({ carrierName, trackingNumber })}
        type="button"
      >
        {busy ? 'Guardando…' : 'Confirmar envío'}
      </button>
    </div>
  )
}
