import React from 'react'

import { computeGroupTotals, formatCOP, getPlatformFeePercent } from '@/utilities/money'

type PayoutSplitBarProps = {
  compact?: boolean
  priceInCOP: null | number
}

/**
 * What the artist actually takes home, shown as proportions rather than prose.
 *
 * Mercado Pago's own processing commission comes off the gross before ours and
 * is only known once a payment settles, so it is named but not invented — a made
 * up percentage here would be a number the artist plans around.
 */
export const PayoutSplitBar: React.FC<PayoutSplitBarProps> = ({ compact = false, priceInCOP }) => {
  if (typeof priceInCOP !== 'number' || priceInCOP <= 0) {
    return <p className="text-[12px] text-muted-foreground">Sin precio configurado.</p>
  }

  const platformFeePercent = getPlatformFeePercent()
  const { artistNetEstimateCOP, platformFeeCOP, totalCOP } = computeGroupTotals({
    items: [{ quantity: 1, unitPriceCOP: priceInCOP }],
    platformFeePercent,
  })

  const artistWidth = Math.round((artistNetEstimateCOP / totalCOP) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-muted-foreground">Precio</span>
        <span className="text-[15px] font-medium tabular-nums text-foreground">
          {formatCOP(totalCOP)}
        </span>
      </div>

      <div
        aria-hidden="true"
        className="flex h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <span className="bg-foreground" style={{ width: `${artistWidth}%` }} />
        <span className="bg-amber-400 dark:bg-amber-500" style={{ width: `${100 - artistWidth}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span className="size-2 rounded-full bg-foreground" />
          Para ti {formatCOP(artistNetEstimateCOP)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full bg-amber-400 dark:bg-amber-500" />
          oddsound {platformFeePercent}% · {formatCOP(platformFeeCOP)}
        </span>
      </div>

      {compact ? null : (
        <p className="text-[11px] leading-4 text-muted-foreground">
          Mercado Pago descuenta aparte su propia comisión de procesamiento antes de liquidar.
        </p>
      )}
    </div>
  )
}
