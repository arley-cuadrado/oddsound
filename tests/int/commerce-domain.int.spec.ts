// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  cents,
  validatePostings,
  transfer,
  weeklyCycle,
  nextCycle,
  validateAllocations,
  deliveryEligible,
  addBusinessDays,
} from '@/commerce/domain'
import { checkoutURL, verifyWompiEvent } from '@/commerce/wompi'
import { normalizeTracking } from '@/commerce/tracking'

describe('commerce financial boundaries', () => {
  it('converts COP exactly once and rejects unsafe amounts', () => {
    expect(cents(10000)).toBe(1000000)
    expect(cents(0.01)).toBe(1)
    expect(() => cents(-1)).toThrow()
    expect(() => cents(Number.MAX_SAFE_INTEGER)).toThrow()
    expect(() =>
      validatePostings([
        { account: 'a', amount: -100 },
        { account: 'b', amount: 99 },
      ]),
    ).toThrow()
    expect(() => validatePostings(transfer('cash', 'payable', 100))).not.toThrow()
  })
  it('uses the Bogotá calendar across year and weekly boundaries', () => {
    const t = new Date('2026-10-28T14:00:00Z')
    expect(weeklyCycle(t).toISOString()).toBe(t.toISOString())
    expect(nextCycle(t).toISOString()).toBe('2026-11-04T14:00:00.000Z')
    expect(weeklyCycle(new Date('2026-10-28T13:59:00Z')).toISOString()).toBe(
      '2026-10-21T14:00:00.000Z',
    )
    expect(addBusinessDays(new Date('2026-10-30T15:00:00Z'), 2, ['2026-11-02']).toISOString()).toBe(
      '2026-11-04T15:00:00.000Z',
    )
  })
  it('requires verified delivery, availability, seven days and no hold', () => {
    const order = { deliveredAt: '2026-10-01T12:00:00Z', reconciledAt: '2026-10-02T12:00:00Z' }
    expect(deliveryEligible(order, new Date('2026-10-08T12:00:00Z'))).toBe(true)
    expect(deliveryEligible({ ...order, blocked: true }, new Date('2026-10-20'))).toBe(false)
    expect(deliveryEligible({ deliveredAt: order.deliveredAt }, new Date('2026-10-20'))).toBe(false)
  })
  it('rejects unrelated guides and allocation beyond ordered units', () => {
    const ordered = [{ product: 'lp', quantity: 2 }]
    expect(() =>
      validateAllocations(
        ordered,
        [{ product: 'lp', quantity: 1 }],
        [{ product: 'lp', quantity: 2 }],
      ),
    ).toThrow()
    expect(() => validateAllocations(ordered, [], [{ product: 'other', quantity: 1 }])).toThrow()
    expect(() => validateAllocations(ordered, [], [{ product: 'lp', quantity: 0.5 }])).toThrow()
  })
  it('checks all signed properties dynamically and rejects omitted money', () => {
    const data = {
      transaction: { id: 'tx', status: 'APPROVED', amount_in_cents: 100000, currency: 'COP' },
    }
    const properties = [
      'transaction.currency',
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ]
    const timestamp = 1700000000
    const checksum = createHash('sha256')
      .update('COPtxAPPROVED100000' + timestamp + 'secret')
      .digest('hex')
    const event = { data, timestamp, signature: { properties, checksum } }
    expect(
      verifyWompiEvent(event, 'secret', [
        'transaction.id',
        'transaction.status',
        'transaction.amount_in_cents',
      ]),
    ).toBe(true)
    expect(
      verifyWompiEvent(
        { ...event, data: { transaction: { ...data.transaction, amount_in_cents: 1 } } },
        'secret',
        ['transaction.id'],
      ),
    ).toBe(false)
    expect(verifyWompiEvent(event, '', ['transaction.id'])).toBe(false)
    expect(verifyWompiEvent(event, 'secret', ['transaction.reference'])).toBe(false)
  })
  it('signs hosted checkout with centavos and expiration', () => {
    process.env.WOMPI_PUBLIC_KEY = 'pub_test_example'
    process.env.WOMPI_INTEGRITY_SECRET = 'secret'
    const url = new URL(
      checkoutURL({
        reference: 'order',
        amount: 1000000,
        expiresAt: '2026-10-28T15:00:00Z',
        redirect: 'https://oddsound.co/cart',
        email: 'buyer@example.com',
      }),
    )
    expect(url.searchParams.get('amount-in-cents')).toBe('1000000')
    expect(url.searchParams.get('signature:integrity')).toBe(
      createHash('sha256').update('order1000000COP2026-10-28T15:00:00Zsecret').digest('hex'),
    )
  })
  it('does not infer delivery from unparseable or future tracking', () => {
    expect(() =>
      normalizeTracking([{ state: 'delivered', at: 'not a date', description: 'Entregado' }]),
    ).toThrow()
    expect(() => normalizeTracking([])).toThrow()
    expect(() =>
      normalizeTracking([{ state: 'delivered', at: '2099-01-01', description: 'Entregado' }]),
    ).toThrow()
  })
})
