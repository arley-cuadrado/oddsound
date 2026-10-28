import config from '@payload-config'
import { getPayload } from 'payload'
import { createHash } from 'node:crypto'
import { enqueue, model } from './store'
import { verifyWompiEvent } from './wompi'

export async function wompiWebhook(request: Request, channel: 'charges' | 'payouts') {
  const secret =
    process.env[channel === 'charges' ? 'WOMPI_EVENTS_SECRET' : 'WOMPI_PAYOUTS_EVENTS_SECRET'] || ''
  if (!secret) return Response.json({ message: 'Webhook no configurado.' }, { status: 503 })
  const text = await request.text()
  if (text.length > 100000) return new Response(null, { status: 413 })
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return new Response(null, { status: 400 })
  }
  const payoutEvent = channel === 'payouts' && body.event === 'payout.updated'
  const fields = payoutEvent
    ? ['payout.id', 'payout.status', 'payout.amountInCents']
    : channel === 'payouts'
      ? ['transaction.id', 'transaction.status', 'transaction.amountInCents']
      : ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']
  if (!verifyWompiEvent(body, secret, fields))
    return Response.json({ message: 'Firma inválida.' }, { status: 401 })
  try {
    const payload = await getPayload({ config })
    const reference = createHash('sha256')
      .update(channel + body.signature.checksum)
      .digest('hex')
    await model(payload, 'commerceEvents').updateOne(
      { reference },
      { $setOnInsert: { reference, channel, body, state: 'pending' } },
      { upsert: true },
    )
    // Repairable outbox: repeated delivery creates the missing task after a crash.
    await enqueue(payload, `event-${reference}`, 'event', { reference })
    return Response.json({ received: true })
  } catch {
    return new Response(null, { status: 503 })
  }
}
