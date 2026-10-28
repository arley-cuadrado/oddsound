export class CommerceError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message)
  }
}

export function cents(pesos: number): number {
  const value = Math.round(pesos * 100)
  if (!Number.isFinite(pesos) || pesos < 0 || !Number.isSafeInteger(value))
    throw new CommerceError('Importe inválido.', 400)
  return value
}

export function integer(value: unknown, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min)
    throw new CommerceError('Se requiere un importe entero válido.', 400)
  return value
}

export type Posting = { account: string; amount: number }
export function validatePostings(postings: Posting[]) {
  if (!Array.isArray(postings) || postings.length < 2)
    throw new CommerceError('El asiento requiere contrapartida.')
  let sum = 0
  for (const p of postings) {
    if (
      !p ||
      typeof p.account !== 'string' ||
      !p.account.trim() ||
      p.account.length > 240 ||
      !Number.isSafeInteger(p.amount) ||
      !p.amount
    )
      throw new CommerceError('Asiento inválido.')
    sum += p.amount
    if (!Number.isSafeInteger(sum)) throw new CommerceError('Desbordamiento contable.')
  }
  if (sum !== 0) throw new CommerceError('El asiento no está balanceado.')
}

export function transfer(from: string, to: string, amount: number): Posting[] {
  integer(amount, 1)
  return [
    { account: from, amount: -amount },
    { account: to, amount },
  ]
}

export function addBusinessDays(start: Date, days: number, holidays: string[] = []): Date {
  const result = new Date(start)
  while (days > 0) {
    result.setUTCDate(result.getUTCDate() + 1)
    const local = new Date(result.getTime() - 5 * 3600000)
    if (![0, 6].includes(local.getUTCDay()) && !holidays.includes(local.toISOString().slice(0, 10)))
      days--
  }
  return result
}

/** Colombia has no daylight-saving transition. All persisted instants are UTC. */
export function weeklyCycle(now: Date, weekday = 3, hour = 9) {
  const local = new Date(now.getTime() - 5 * 3600000)
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  let scheduled = midnight + (weekday - local.getUTCDay()) * 86400000 + (hour + 5) * 3600000
  if (scheduled > now.getTime()) scheduled -= 7 * 86400000
  return new Date(scheduled)
}

export function nextCycle(now: Date, weekday = 3, hour = 9) {
  return new Date(weeklyCycle(now, weekday, hour).getTime() + 7 * 86400000)
}

export type Allocation = { product: string; quantity: number }
export function validateAllocations(
  ordered: Allocation[],
  existing: Allocation[],
  added: Allocation[],
) {
  if (!added.length) throw new CommerceError('Selecciona las unidades del envío.', 400)
  const used = new Map<string, number>()
  for (const row of [...existing, ...added])
    used.set(row.product, (used.get(row.product) || 0) + integer(row.quantity, 1))
  for (const [product, quantity] of used) {
    if (quantity > ordered.filter((x) => x.product === product).reduce((n, x) => n + x.quantity, 0))
      throw new CommerceError('Las unidades de las guías exceden el pedido.', 400)
  }
}

export function deliveryEligible(
  order: { deliveredAt?: string; reconciledAt?: string; blocked?: boolean },
  now = new Date(),
) {
  return Boolean(
    order.deliveredAt &&
    order.reconciledAt &&
    !order.blocked &&
    new Date(order.deliveredAt).getTime() + 7 * 86400000 <= now.getTime(),
  )
}

export const CARRIERS = [
  {
    code: 'servientrega',
    name: 'Servientrega',
    url: 'https://www.servientrega.com/wps/portal/rastreo-envio',
  },
  {
    code: 'coordinadora',
    name: 'Coordinadora',
    url: 'https://rastreo.coordinadora.com/?guia={guide}',
  },
  { code: 'interrapidisimo', name: 'Inter Rapidísimo', url: 'https://interrapidisimo.com/' },
  { code: 'envia', name: 'Envía', url: 'https://envia.co/' },
  { code: 'tcc', name: 'TCC', url: 'https://tcc.com.co/courier/mensajeria/rastrear-envio/' },
  { code: 'deprisa', name: 'Deprisa', url: 'https://www.deprisa.com/' },
  { code: '472', name: '4-72', url: 'https://www.4-72.com.co/' },
] as const

export function trackingLink(carrier: string, guide: string) {
  const found = CARRIERS.find((x) => x.code === carrier)
  if (!found) throw new CommerceError('Transportadora no habilitada.', 400)
  return found.url.replace('{guide}', encodeURIComponent(guide))
}
