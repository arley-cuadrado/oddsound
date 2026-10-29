// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Where } from 'payload'
import {
  registerDateWhere,
  readRegisterDateFilter,
  replaceRegisterDateWhere,
  type RegisterDateFilter,
} from '@/commerce/registerFilters'

const filter = (
  period: RegisterDateFilter['period'],
  value: string,
  end = '',
): RegisterDateFilter => ({ field: 'createdAt', period, value, end })
describe('Shop Register date windows', () => {
  it('includes the entire Colombia day, with an exclusive next-day boundary', () => {
    expect(registerDateWhere(filter('day', '2026-10-29'))).toEqual({
      createdAt: {
        greater_than_equal: '2026-10-29T05:00:00.000Z',
        less_than: '2026-10-30T05:00:00.000Z',
      },
    })
    expect(registerDateWhere(filter('month', '2024-02'))).toEqual({
      createdAt: {
        greater_than_equal: '2024-02-01T05:00:00.000Z',
        less_than: '2024-03-01T05:00:00.000Z',
      },
    })
    expect(registerDateWhere(filter('year', '2026'))).toEqual({
      createdAt: {
        greater_than_equal: '2026-01-01T05:00:00.000Z',
        less_than: '2027-01-01T05:00:00.000Z',
      },
    })
  })
  it('includes the last selected range day and rejects normalized invalid dates or inverted ranges', () => {
    expect(registerDateWhere(filter('range', '2026-12-30', '2026-12-31'))).toEqual({
      createdAt: {
        greater_than_equal: '2026-12-30T05:00:00.000Z',
        less_than: '2027-01-01T05:00:00.000Z',
      },
    })
    for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', 'not-a-date'])
      expect(() => registerDateWhere(filter('day', value))).toThrow()
    expect(() => registerDateWhere(filter('range', '2026-11-02', '2026-11-01'))).toThrow(/final/)
  })
  it('restores selected periods after pagination or browser navigation', () => {
    for (const f of [
      filter('day', '2026-10-29'),
      filter('month', '2026-12'),
      filter('year', '2024'),
      filter('range', '2026-10-28', '2026-11-03'),
    ]) {
      const restored = readRegisterDateFilter(JSON.parse(JSON.stringify(registerDateWhere(f))))
      expect(registerDateWhere(restored)).toEqual(registerDateWhere(f))
      expect(restored.period).toBe(f.period)
    }
  })
  it('replaces or clears quick dates without discarding unrelated advanced filters or OR branches', () => {
    const native: Where = {
      or: [{ state: { equals: 'pending' } }, { reference: { like: 'pedido' } }],
    }
    const first = replaceRegisterDateWhere(native, registerDateWhere(filter('day', '2026-10-29')))
    const updated = { ...filter('month', '2026-11'), field: 'updatedAt' as const }
    const second = replaceRegisterDateWhere(first, registerDateWhere(updated))
    expect(readRegisterDateFilter(second).field).toBe('updatedAt')
    expect(JSON.stringify(second)).not.toContain('2026-10-29')
    expect(replaceRegisterDateWhere(second, null)).toEqual(native)
    expect(native).toEqual({
      or: [{ state: { equals: 'pending' } }, { reference: { like: 'pedido' } }],
    })
  })
  it('preserves native time-of-day constraints instead of treating them as quick calendar filters', () => {
    const native = {
      createdAt: {
        greater_than_equal: '2026-10-29T13:00:00.000Z',
        less_than: '2026-10-29T14:00:00.000Z',
      },
    }
    expect(replaceRegisterDateWhere(native, null)).toEqual(native)
    expect(readRegisterDateFilter(native).period).toBe('all')
  })
})
