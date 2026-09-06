import Link from 'next/link'
import React from 'react'

import type { SanitizedMercadoPagoConnection } from '@/utilities/mercadoPagoOAuth'
import type { MerchOnboarding } from '@/utilities/merchOnboarding'
import { getPlatformFeePercent } from '@/utilities/money'
import { cn } from '@/utilities/ui'
import { panelBody, panelCard, panelEyebrow, panelTitle, primaryButton, secondaryButton, tone } from './ui'

type MercadoPagoConnectionCardProps = {
  connection: SanitizedMercadoPagoConnection
  merch: MerchOnboarding
  profileSlug?: null | string
}

function formatDate(value: null | string | undefined) {
  if (!value) return null

  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))
}

/**
 * The artist's path to selling, drawn as a rail rather than described.
 *
 * Only the step that is actually next carries a filled button; the ones behind
 * it collapse to a tick. "What do I do now" is answered by looking, which
 * matters because connecting Mercado Pago, setting shipping and publishing a
 * product live on three unrelated screens.
 */
export function MercadoPagoConnectionCard({
  connection,
  merch,
  profileSlug,
}: MercadoPagoConnectionCardProps) {
  const { needsReconnect, steps } = merch
  const activeIndex = steps.findIndex((step) => !step.done)

  return (
    <section className={cn(panelCard, 'space-y-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={panelEyebrow}>Cobros</p>
          <h2 className={panelTitle}>
            {merch.ready ? 'Tu tienda está lista' : 'Tres pasos para empezar a vender'}
          </h2>
          {profileSlug ? (
            <p className="text-[12px] text-muted-foreground">
              Tu merch se vende en /{profileSlug}/shop
            </p>
          ) : null}
        </div>

        <span
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-medium',
            merch.ready
              ? cn(tone.ok, tone.okText)
              : needsReconnect
                ? cn(tone.alert, tone.alertText)
                : 'border-border bg-muted text-muted-foreground',
          )}
        >
          {merch.ready ? 'Listo para vender' : needsReconnect ? 'Requiere acción' : 'Pendiente'}
        </span>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const active = index === activeIndex

          return (
            <li
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-4 transition',
                step.done
                  ? cn(tone.ok)
                  : active
                    ? 'border-foreground/30 bg-background'
                    : 'border-border bg-background opacity-60',
              )}
              key={step.key}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                    step.done
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.done ? <CheckIcon /> : index + 1}
                </span>
                <p className="text-[14px] font-medium text-foreground">{step.title}</p>
              </div>

              <p className="flex-1 text-[12px] leading-5 text-muted-foreground">{step.detail}</p>

              {step.action && !step.done ? (
                <Link
                  className={cn(
                    'h-10 rounded-lg px-4 text-[12px]',
                    active ? primaryButton : secondaryButton,
                  )}
                  href={step.action}
                >
                  {step.actionLabel}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ol>

      {connection.status === 'connected' ? <TokenMeter connection={connection} /> : null}

      {connection.lastError && needsReconnect ? (
        <p className={cn('rounded-xl border px-4 py-3 text-[12px] leading-5', tone.alert, tone.alertText)}>
          {connection.lastError}
        </p>
      ) : null}

      <p className={panelBody}>
        Cobras directo a tu cuenta. oddsound se queda el {getPlatformFeePercent()}%.
      </p>
    </section>
  )
}

/**
 * How much life the Mercado Pago authorisation has left.
 *
 * It renews itself long before this runs out, so the meter is mostly
 * reassurance — but when renewal has genuinely failed, an artist needs to see it
 * here rather than find out through a buyer who could not pay.
 */
function TokenMeter({ connection }: { connection: SanitizedMercadoPagoConnection }) {
  const { daysRemaining, lifetimeRatio, state } = connection.health
  const lastRefreshedAt = formatDate(connection.lastRefreshedAt || connection.lastConnectedAt)

  const meter =
    state === 'expired'
      ? { bar: 'bg-rose-600', label: 'La autorización expiró.' }
      : state === 'expiring'
        ? { bar: 'bg-amber-500', label: `Se renueva sola. Quedan ${daysRemaining} días.` }
        : { bar: 'bg-emerald-600', label: `Autorización vigente por ${daysRemaining} días más.` }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] text-foreground">{meter.label}</p>
        {lastRefreshedAt ? (
          <p className="text-[11px] text-muted-foreground">Última renovación: {lastRefreshedAt}</p>
        ) : null}
      </div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className={cn('block h-full rounded-full', meter.bar)}
          style={{ width: `${Math.max(4, Math.round(lifetimeRatio * 100))}%` }}
        />
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 16 16" width="12">
      <path
        d="M3 8.5 6.2 12 13 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
