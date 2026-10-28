import { createHash, timingSafeEqual } from 'node:crypto'
import { CommerceError, integer } from './domain'

export function wompiEnvironment() {
  return process.env.WOMPI_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
}
export function wompiAPI() {
  return wompiEnvironment() === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1'
}

export function checkoutURL(input: {
  reference: string
  amount: number
  expiresAt: string
  redirect: string
  email: string
}) {
  const publicKey = process.env.WOMPI_PUBLIC_KEY || ''
  const secret = process.env.WOMPI_INTEGRITY_SECRET || ''
  if (
    !publicKey.startsWith(wompiEnvironment() === 'production' ? 'pub_prod_' : 'pub_test_') ||
    !secret
  )
    throw new CommerceError('Wompi no está configurado.', 503)
  const signature = createHash('sha256')
    .update(`${input.reference}${integer(input.amount, 1)}COP${input.expiresAt}${secret}`)
    .digest('hex')
  const url = new URL('https://checkout.wompi.co/p/')
  for (const [key, value] of Object.entries({
    'public-key': publicKey,
    currency: 'COP',
    'amount-in-cents': String(input.amount),
    reference: input.reference,
    'signature:integrity': signature,
    'expiration-time': input.expiresAt,
    'redirect-url': input.redirect,
    'customer-data:email': input.email,
  }))
    url.searchParams.set(key, value)
  return url.toString()
}

export function verifyWompiEvent(body: Record<string, any>, secret: string, required: string[]) {
  const props = body.signature?.properties
  if (
    !secret ||
    !Array.isArray(props) ||
    !required.every((x) => props.includes(x)) ||
    !props.every((x) => typeof x === 'string')
  )
    return false
  if (!Number.isSafeInteger(body.timestamp) || body.timestamp <= 0) return false
  // Authentic historical events can be retried. Persistent event/reference
  // idempotency, rather than a short timestamp window, prevents replay effects.
  const values: string[] = []
  for (const path of props) {
    if (!/^[a-zA-Z0-9_.]+$/.test(path) || /__proto__|constructor|prototype/.test(path)) return false
    let value: any = body.data
    for (const part of path.split('.'))
      value = value && Object.hasOwn(value, part) ? value[part] : undefined
    if (!['string', 'number'].includes(typeof value)) return false
    values.push(String(value))
  }
  const expected = createHash('sha256')
    .update(values.join('') + body.timestamp + secret)
    .digest('hex')
  const given = body.signature?.checksum
  return (
    typeof given === 'string' &&
    /^[a-f0-9]{64}$/i.test(given) &&
    timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(given, 'hex'))
  )
}

async function responseJSON(response: Response) {
  if (!response.ok) throw new Error(`Wompi HTTP ${response.status}`)
  return response.json()
}

export async function fetchWompiTransaction(id: string) {
  const result = await responseJSON(
    await fetch(`${wompiAPI()}/transactions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY || ''}` },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    }),
  )
  return result.data
}

export async function findWompiTransactions(reference: string) {
  const result = await responseJSON(
    await fetch(`${wompiAPI()}/transactions?reference=${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY || ''}` },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    }),
  )
  if (!Array.isArray(result.data))
    throw new Error('No fue posible verificar los intentos del pago.')
  return result.data
}

export async function wompiRefund(transactionID: string, amount: number, reference: string) {
  return responseJSON(
    await fetch(`${wompiAPI()}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: transactionID,
        amount_in_cents: integer(amount, 1),
        reference,
      }),
      signal: AbortSignal.timeout(20000),
    }),
  )
}

/** Host is configured by deployment, never by a browser request. */
export async function payoutsAPI(path: string, body?: unknown, reference?: string) {
  const base = process.env.WOMPI_PAYOUTS_BASE_URL
  if (!base || !process.env.WOMPI_PAYOUTS_API_KEY || !process.env.WOMPI_PAYOUTS_PRINCIPAL_ID)
    throw new CommerceError('Dispersión no configurada.', 503)
  const url = new URL(base)
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.wompi.co'))
    throw new CommerceError('Host de dispersión inválido.', 503)
  return responseJSON(
    await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'x-api-key': process.env.WOMPI_PAYOUTS_API_KEY,
        'user-principal-id': process.env.WOMPI_PAYOUTS_PRINCIPAL_ID,
        'Content-Type': 'application/json',
        ...(reference ? { 'idempotency-key': reference } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
    }),
  )
}
