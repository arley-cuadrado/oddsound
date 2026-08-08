import type { Payload } from 'payload'

import type { MarketplaceSetting } from '@/payload-types'

export type MarketplaceShippingZone = {
  additionalKgRateCOP: number
  baseRateCOP: number
  code: string
  estimatedBusinessDays: number
  freeShippingThresholdCOP?: null | number
  label: string
  stateKeywords: string[]
}

export type ResolvedMarketplaceSettings = {
  checkoutCurrencyCode: 'COP'
  platformFeePercent: number
  provider: 'mercadopago'
  shippingZones: MarketplaceShippingZone[]
  usdToCopRate: number
  webhookAuthToken?: null | string
}

function sanitizeNumber(value: null | number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export async function getMarketplaceSettings(payload: Payload): Promise<ResolvedMarketplaceSettings> {
  let settings: MarketplaceSetting | null = null

  try {
    settings = (await payload.findGlobal({
      slug: 'marketplace-settings',
      overrideAccess: true,
    })) as MarketplaceSetting
  } catch {
    settings = null
  }

  const shippingZones =
    settings?.shippingZones?.map((zone) => ({
      additionalKgRateCOP: sanitizeNumber(zone.additionalKgRateCOP, 0),
      baseRateCOP: sanitizeNumber(zone.baseRateCOP, 0),
      code: zone.code || '',
      estimatedBusinessDays: sanitizeNumber(zone.estimatedBusinessDays, 3),
      freeShippingThresholdCOP: zone.freeShippingThresholdCOP ?? null,
      label: zone.label || zone.code || 'Zona',
      stateKeywords:
        zone.stateKeywords
          ?.map((entry) => entry?.value?.trim().toLowerCase())
          .filter((value): value is string => Boolean(value)) || [],
    })) || []

  return {
    checkoutCurrencyCode: 'COP',
    platformFeePercent: sanitizeNumber(settings?.platformFeePercent, 10),
    provider: 'mercadopago',
    shippingZones,
    usdToCopRate: sanitizeNumber(settings?.usdToCopRate, 4000),
    webhookAuthToken: settings?.webhookAuthToken || null,
  }
}
