import type { Where } from 'payload'

export const registerPageSizes = [15, 30, 50, 100]
export const registerSearchFields: Record<string, string[]> = {
  commerceConversations: ['order', 'artist', 'buyer'],
  commerceMessages: ['body', 'order', 'sender', 'product'],
  commerceReviews: ['publicName', 'body', 'order', 'artist', 'product'],
  commerceReviewReports: ['reason', 'review', 'reporter'],
  commerceJournal: ['reference', 'kind', 'order', 'artist'],
  commerceLocks: ['key'],
  commerceEvents: ['reference', 'channel', 'error'],
  commercePayouts: ['reference', 'artist', 'providerID', 'providerTransactionID'],
  commerceBanks: ['artist', 'lastFour'],
  commerceShipments: ['guide', 'reference', 'carrier', 'order', 'artist'],
  commerceCases: ['reference', 'order', 'artist', 'decision'],
  commerceRefunds: ['reference', 'order', 'artist', 'providerID'],
  commerceIncidents: ['reference', 'order', 'artist', 'reason'],
  commerceAudits: ['reference', 'actor', 'action'],
  commerceAttachments: ['name', 'mime', 'caseID'],
  commerceGuestAccess: ['order'],
  commerceTasks: ['reference', 'kind', 'error'],
  commerceCarriers: ['name', 'code'],
}

export type RegisterDateFilter = {
  field: 'createdAt' | 'updatedAt'
  period: 'all' | 'day' | 'month' | 'year' | 'range'
  value: string
  end: string
}
export const emptyRegisterDateFilter: RegisterDateFilter = {
  field: 'createdAt',
  period: 'all',
  value: '',
  end: '',
}
const dayMS = 86400000

function parseDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Selecciona una fecha válida.')
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(`${value}T00:00:00-05:00`)
  if (
    year < 1000 ||
    year > 9998 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    !Number.isFinite(date.getTime())
  )
    throw new Error('Selecciona una fecha válida entre los años 1000 y 9998.')
  return date
}

/** Calendar periods in Colombia (UTC-05), with an exclusive upper bound. */
export function registerDateWhere(filter: RegisterDateFilter): Where | null {
  if (filter.period === 'all') return null
  let first = filter.value
  if (filter.period === 'year') {
    if (!/^\d{4}$/.test(first)) throw new Error('Escribe un año de cuatro dígitos.')
    first += '-01-01'
  } else if (filter.period === 'month') {
    if (!/^\d{4}-\d{2}$/.test(first)) throw new Error('Selecciona un mes válido.')
    first += '-01'
  }
  const start = parseDay(first)
  let end: Date
  if (filter.period === 'year') end = new Date(`${start.getUTCFullYear() + 1}-01-01T00:00:00-05:00`)
  else if (filter.period === 'month') {
    const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 5))
    end = next
  } else if (filter.period === 'range') end = new Date(parseDay(filter.end).getTime() + dayMS)
  else end = new Date(start.getTime() + dayMS)
  if (end <= start) throw new Error('La fecha final debe ser igual o posterior a la inicial.')
  return {
    [filter.field]: { greater_than_equal: start.toISOString(), less_than: end.toISOString() },
  }
}

function managedRange(where: Where) {
  const keys = Object.keys(where)
  if (keys.length !== 1 || !['createdAt', 'updatedAt'].includes(keys[0])) return null
  const field = keys[0] as RegisterDateFilter['field']
  const value = where[field]
  if (!value || typeof value !== 'object' || Object.keys(value).length !== 2) return null
  const { greater_than_equal: start, less_than: end } = value as Record<string, unknown>
  const midnight = /^\d{4}-\d{2}-\d{2}T05:00:00\.000Z$/
  if (
    typeof start !== 'string' ||
    typeof end !== 'string' ||
    !midnight.test(start) ||
    !midnight.test(end) ||
    !(Date.parse(start) < Date.parse(end))
  )
    return null
  return { field, start, end }
}

function findRange(where: Where): ReturnType<typeof managedRange> {
  const range = managedRange(where)
  if (range) return range
  for (const child of where.and || []) {
    const found = findRange(child)
    if (found) return found
  }
  return null
}

export function readRegisterDateFilter(where: Where = {}): RegisterDateFilter {
  const range = findRange(where)
  if (!range) return { ...emptyRegisterDateFilter }
  const value = range.start.slice(0, 10)
  const base = {
    field: range.field,
    value,
    end: new Date(Date.parse(range.end) - dayMS).toISOString().slice(0, 10),
  }
  if (Date.parse(range.end) - Date.parse(range.start) === dayMS) return { ...base, period: 'day' }
  if (value.endsWith('-01-01') && range.end.startsWith(`${Number(value.slice(0, 4)) + 1}-01-01`))
    return { ...base, period: 'year', value: value.slice(0, 4) }
  const nextMonth = new Date(
    Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)), 1, 5),
  ).toISOString()
  if (value.endsWith('-01') && range.end === nextMonth)
    return { ...base, period: 'month', value: value.slice(0, 7) }
  return { ...base, period: 'range' }
}

/** Replace quick date windows in conjunctions, preserving advanced filters and OR branches. */
export function replaceRegisterDateWhere(where: Where = {}, date: Where | null): Where {
  function strip(value: Where): Where {
    if (managedRange(value)) return {}
    const next = { ...value }
    if (next.and) {
      next.and = next.and.map(strip).filter((item) => Object.keys(item).length > 0)
      if (!next.and.length) delete next.and
    }
    if (Object.keys(next).length === 1 && next.and?.length === 1) return next.and[0]
    return next
  }
  const base = strip(where)
  if (!date) return base
  return Object.keys(base).length ? { and: [base, date] } : date
}
