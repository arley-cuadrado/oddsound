import { beforeEach, describe, expect, it } from 'vitest'

import { computeGroupTotals, formatCOP, getPlatformFeePercent } from '@/utilities/money'

describe('computeGroupTotals', () => {
  beforeEach(() => {
    process.env.MARKETPLACE_PLATFORM_FEE_PERCENT = '12'
  })

  it('adds up line items by quantity', () => {
    const totals = computeGroupTotals({
      items: [
        { quantity: 1, unitPriceCOP: 120000 },
        { quantity: 2, unitPriceCOP: 90000 },
      ],
    })

    expect(totals.subtotalCOP).toBe(300000)
    expect(totals.totalCOP).toBe(300000)
  })

  it('keeps shipping out of the commission base so the artist keeps it whole', () => {
    const withoutShipping = computeGroupTotals({
      items: [{ quantity: 1, unitPriceCOP: 100000 }],
    })
    const withShipping = computeGroupTotals({
      items: [{ quantity: 1, unitPriceCOP: 100000 }],
      shippingCOP: 15000,
    })

    expect(withShipping.platformFeeCOP).toBe(withoutShipping.platformFeeCOP)
    expect(withShipping.totalCOP).toBe(115000)
    expect(withShipping.artistNetEstimateCOP).toBe(115000 - 12000)
  })

  it('rounds the platform fee to whole pesos', () => {
    const totals = computeGroupTotals({
      items: [{ quantity: 1, unitPriceCOP: 33333 }],
      platformFeePercent: 12,
    })

    expect(Number.isInteger(totals.platformFeeCOP)).toBe(true)
    expect(totals.platformFeeCOP).toBe(4000)
  })

  it('ignores negative and non-numeric prices instead of charging them', () => {
    const totals = computeGroupTotals({
      items: [
        { quantity: 1, unitPriceCOP: -5000 },
        { quantity: 1, unitPriceCOP: Number.NaN },
        { quantity: 1, unitPriceCOP: 10000 },
      ],
    })

    expect(totals.subtotalCOP).toBe(10000)
  })
})

describe('getPlatformFeePercent', () => {
  it('falls back when the env var would leave the artist with nothing', () => {
    process.env.MARKETPLACE_PLATFORM_FEE_PERCENT = '120'
    expect(getPlatformFeePercent()).toBe(12)

    process.env.MARKETPLACE_PLATFORM_FEE_PERCENT = 'doce'
    expect(getPlatformFeePercent()).toBe(12)

    process.env.MARKETPLACE_PLATFORM_FEE_PERCENT = '8'
    expect(getPlatformFeePercent()).toBe(8)
  })
})

describe('formatCOP', () => {
  it('renders whole pesos with no decimals', () => {
    expect(formatCOP(120000)).toMatch(/120\.000/)
    expect(formatCOP(120000)).not.toMatch(/,00/)
  })

  it('treats missing amounts as zero rather than NaN', () => {
    expect(formatCOP(null)).toMatch(/0/)
    expect(formatCOP(undefined)).not.toMatch(/NaN/)
  })
})
