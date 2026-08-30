import crypto from 'crypto'

/**
 * How far out of date a notification's timestamp may be before we treat it as a
 * replay. Mercado Pago retries for hours, so this has to be generous.
 */
const MAX_SIGNATURE_AGE_MS = 6 * 60 * 60 * 1000

export function getMercadoPagoWebhookSecret(): string {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
}

function parseSignatureHeader(header: string): { ts: string; v1: string } | null {
  let ts = ''
  let v1 = ''

  for (const part of header.split(',')) {
    const separator = part.indexOf('=')

    if (separator === -1) continue

    const key = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()

    if (key === 'ts') ts = value
    if (key === 'v1') v1 = value
  }

  return ts && v1 ? { ts, v1 } : null
}

/**
 * Mercado Pago's documented manifest. Segments whose value is missing are left
 * out entirely rather than sent empty.
 *
 * @see https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
 */
export function buildSignatureManifest({
  dataID,
  requestID,
  ts,
}: {
  dataID: string
  requestID: string
  ts: string
}): string {
  const segments: string[] = []

  // The docs ask for the id lowercased when it is alphanumeric.
  if (dataID) segments.push(`id:${dataID.toLowerCase()};`)
  if (requestID) segments.push(`request-id:${requestID};`)
  if (ts) segments.push(`ts:${ts};`)

  return segments.join('')
}

function timestampIsFresh(ts: string): boolean {
  const parsed = Number(ts)

  if (!Number.isFinite(parsed) || parsed <= 0) return false

  // Mercado Pago has sent this in seconds and in milliseconds over time; ten
  // digits is unambiguously seconds until the year 2286.
  const asMs = String(Math.trunc(parsed)).length <= 10 ? parsed * 1000 : parsed

  return Math.abs(Date.now() - asMs) <= MAX_SIGNATURE_AGE_MS
}

function safeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')

  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}

/**
 * Validates that a webhook really came from Mercado Pago.
 *
 * Without this the endpoint trusts any caller who guessed the URL, and this one
 * moves orders to `completed`.
 */
export function verifyMercadoPagoSignature({
  dataID,
  requestID,
  secret = getMercadoPagoWebhookSecret(),
  signatureHeader,
}: {
  dataID: null | string | undefined
  requestID: null | string | undefined
  secret?: string
  signatureHeader: null | string | undefined
}): boolean {
  if (!secret || !signatureHeader || !dataID) return false

  const parsed = parseSignatureHeader(signatureHeader)

  if (!parsed) return false
  if (!timestampIsFresh(parsed.ts)) return false

  const manifest = buildSignatureManifest({
    dataID,
    requestID: requestID || '',
    ts: parsed.ts,
  })

  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  return safeEquals(expected, parsed.v1.toLowerCase())
}
