import type { Product } from '@/payload-types'
import type { MarketplaceShippingZone, ResolvedMarketplaceSettings } from './marketplaceSettings'

export type ShippingQuoteInput = {
  country?: null | string
  state?: null | string
}

function normalizeText(value: null | string | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function findShippingZone({
  settings,
  shippingAddress,
}: {
  settings: ResolvedMarketplaceSettings
  shippingAddress: ShippingQuoteInput
}): MarketplaceShippingZone | null {
  const normalizedState = normalizeText(shippingAddress.state)

  if (!normalizedState) return null

  return (
    settings.shippingZones.find((zone) =>
      zone.stateKeywords.some((keyword) => normalizeText(keyword) === normalizedState),
    ) || null
  )
}

export function resolveShippingAmountCOP({
  product,
  settings,
  shippingAddress,
  subtotalCOP,
}: {
  product: Product
  settings: ResolvedMarketplaceSettings
  shippingAddress: ShippingQuoteInput
  subtotalCOP: number
}) {
  if (product.productType === 'digital' || product.requiresShipping === false) {
    return {
      amountCOP: 0,
      estimatedBusinessDays: 0,
      zone: null,
    }
  }

  const zone = findShippingZone({ settings, shippingAddress })

  if (!zone) {
    throw new Error('No shipping zone matches the provided department/state.')
  }

  if (typeof zone.freeShippingThresholdCOP === 'number' && subtotalCOP >= zone.freeShippingThresholdCOP) {
    return {
      amountCOP: 0,
      estimatedBusinessDays: zone.estimatedBusinessDays,
      zone,
    }
  }

  const weightInKg = Math.max(0, Math.ceil((product.weightInGrams || 0) / 1000))
  const extraKg = Math.max(0, weightInKg - 1)
  const amountCOP = zone.baseRateCOP + extraKg * zone.additionalKgRateCOP

  return {
    amountCOP,
    estimatedBusinessDays: zone.estimatedBusinessDays,
    zone,
  }
}
