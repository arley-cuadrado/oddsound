'use client'

import React, { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCOP } from '@/utilities/money'
import { cn } from '@/utilities/ui'
import { panelBody, panelCard, panelEyebrow, panelTitle, primaryButton } from './ui'

type ShippingSettingsCardProps = {
  initialNotes: string
  initialRate: number
}

/**
 * The artist's flat shipping rate.
 *
 * One number per artist rather than per product or per zone: every payment in a
 * cart is already scoped to a single artist, so shipping naturally belongs at
 * that level too, and one field is something an artist will actually fill in.
 */
export const ShippingSettingsCard: React.FC<ShippingSettingsCardProps> = ({
  initialNotes,
  initialRate,
}) => {
  const [rate, setRate] = useState(String(initialRate || 0))
  const [notes, setNotes] = useState(initialNotes)
  const [state, setState] = useState<'idle' | 'saved' | 'saving'>('idle')
  const [error, setError] = useState<null | string>(null)

  const parsedRate = Number(rate.replace(/[^\d]/g, '')) || 0

  const handleSave = async () => {
    setState('saving')
    setError(null)

    try {
      const response = await fetch('/creator-api/commerce/shipping', {
        body: JSON.stringify({ shippingFlatRateCOP: parsedRate, shippingNotes: notes }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string }

        setError(data.message || 'No pudimos guardar el envío.')
        setState('idle')

        return
      }

      setState('saved')
      setTimeout(() => setState('idle'), 2200)
    } catch {
      setError('No pudimos guardar el envío.')
      setState('idle')
    }
  }

  return (
    <section className={cn(panelCard, 'space-y-5')}>
      <div className="space-y-1">
        <p className={panelEyebrow}>
          Envío
        </p>
        <h2 className={panelTitle}>Tu tarifa por pedido</h2>
        <p className={cn(panelBody, 'max-w-[42rem]')}>
          Una por pedido, no por producto. El envío no paga comisión.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label className="text-[12px] text-muted-foreground" htmlFor="shipping-rate">
            Costo en COP
          </Label>
          <Input
            className="h-11 rounded-xl bg-background tabular-nums"
            id="shipping-rate"
            inputMode="numeric"
            onChange={(event) => setRate(event.target.value)}
            value={rate}
          />
          <p className="text-[11px] text-muted-foreground">
            {parsedRate === 0 ? 'Envío gratis' : formatCOP(parsedRate)}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] text-muted-foreground" htmlFor="shipping-notes">
            Cobertura y tiempos
          </Label>
          <Input
            className="h-11 rounded-xl bg-background"
            id="shipping-notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Envíos a toda Colombia, 3 a 5 días hábiles."
            value={notes}
          />
        </div>
      </div>

      {error ? <p className="text-[12px] text-rose-700 dark:text-rose-300">{error}</p> : null}

      <button
        className={primaryButton}
        disabled={state === 'saving'}
        onClick={handleSave}
        type="button"
      >
        {state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado' : 'Guardar envío'}
      </button>
    </section>
  )
}
