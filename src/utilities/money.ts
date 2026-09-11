import { COP } from '@/config/currencies'

const DEFAULT_PLATFORM_FEE_PERCENT = 12

export type MoneyLineItem = {
  quantity: number
  unitPriceCOP: number
}

export type GroupTotals = {
  /**
   * What the artist ends up with *before* Mercado Pago takes its own processing
   * commission. It is an estimate on purpose: Mercado Pago deducts its fee from
   * the gross first and only tells us the amount once the payment settles, so
   * the exact figure arrives with the webhook.
   */
  artistNetEstimateCOP: number
  platformFeeCOP: number
  shippingCOP: number
  subtotalCOP: number
  totalCOP: number
}

function toWholePesos(value: unknown): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) return 0

  return Math.round(parsed)
}

export function getPlatformFeePercent(): number {
  const parsed = Number(process.env.MARKETPLACE_PLATFORM_FEE_PERCENT)

  // A fee of 100% or more would leave the artist with nothing and Mercado Pago
  // would reject the preference anyway, so a bad env var falls back instead of
  // silently pricing a sale wrong.
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100) {
    return DEFAULT_PLATFORM_FEE_PERCENT
  }

  return parsed
}

/**
 * The one place that decides how a cart group's money is split. Shipping is
 * deliberately excluded from the commission base: the artist pays to ship, so
 * the artist keeps that part whole.
 */
export function computeGroupTotals({
  items,
  platformFeePercent = getPlatformFeePercent(),
  shippingCOP = 0,
}: {
  items: MoneyLineItem[]
  platformFeePercent?: number
  shippingCOP?: number
}): GroupTotals {
  const subtotalCOP = items.reduce((sum, item) => {
    const quantity = Math.max(0, Math.round(Number(item.quantity) || 0))

    return sum + toWholePesos(item.unitPriceCOP) * quantity
  }, 0)

  const shipping = toWholePesos(shippingCOP)
  const totalCOP = subtotalCOP + shipping
  const platformFeeCOP = Math.round((subtotalCOP * platformFeePercent) / 100)

  return {
    artistNetEstimateCOP: totalCOP - platformFeeCOP,
    platformFeeCOP,
    shippingCOP: shipping,
    subtotalCOP,
    totalCOP,
  }
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  currency: COP.code,
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: 'currency',
})

export function formatCOP(value: null | number | undefined): string {
  return copFormatter.format(toWholePesos(value))
}
