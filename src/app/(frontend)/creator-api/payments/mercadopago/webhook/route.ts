import config from '@payload-config'
import { getPayload } from 'payload'

import type { Order, Product, Profile, Transaction } from '@/payload-types'
import {
  fetchMercadoPagoPayment,
  mapMercadoPagoPaymentToOrderStatus,
  mapMercadoPagoPaymentToTransactionStatus,
  type MercadoPagoPaymentResponse,
  resolveProcessorFeeAmountCOP,
} from '@/utilities/mercadoPagoCheckout'
import { withMercadoPagoAccessToken } from '@/utilities/mercadoPagoTokens'
import {
  getMercadoPagoWebhookSecret,
  verifyMercadoPagoSignature,
} from '@/utilities/mercadoPagoWebhook'

type MercadoPagoWebhookPayload = {
  action?: string
  data?: {
    id?: number | string
  }
  type?: string
  user_id?: number | string
}

async function findProfileBySellerID({
  payload,
  sellerID,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  sellerID: string
}) {
  const result = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      'mercadoPagoConnection.sellerID': {
        equals: sellerID,
      },
    },
  })

  return (result.docs[0] as Profile | undefined) || null
}

function resolveFulfillmentStatus(order: Order, paymentStatus?: null | string): Order['fulfillmentStatus'] {
  if (order.fulfillmentStatus === 'not_required') return 'not_required'

  switch (paymentStatus) {
    case 'approved':
      return 'ready_to_ship'
    case 'refunded':
      return 'refunded'
    case 'cancelled':
    case 'rejected':
      return 'cancelled'
    default:
      return order.fulfillmentStatus || 'pending_payment'
  }
}

/**
 * Takes stock off the shelf exactly once per order.
 *
 * Mercado Pago retries a notification until it gets a 200 and may deliver the
 * same event more than once, so the right to decrement is claimed with an atomic
 * compare-and-set on the order rather than a read-then-write.
 */
async function adjustInventoryOnce({
  order,
  payload,
}: {
  order: Order
  payload: Awaited<ReturnType<typeof getPayload>>
}): Promise<void> {
  const model = payload.db.collections?.orders

  if (!model) return

  const claimed = await model.findOneAndUpdate(
    {
      _id: String(order.id),
      $or: [{ inventoryAdjustedAt: { $exists: false } }, { inventoryAdjustedAt: null }],
    },
    { $set: { inventoryAdjustedAt: new Date() } },
    { lean: true, new: true },
  )

  if (!claimed) return

  for (const line of order.items || []) {
    const productID = typeof line.product === 'string' ? line.product : line.product?.id

    if (!productID) continue

    const product = (await payload
      .findByID({ collection: 'products', id: String(productID), depth: 0, overrideAccess: true })
      .catch(() => null)) as null | Product

    if (!product || typeof product.inventory !== 'number') continue

    await payload.update({
      collection: 'products',
      id: String(productID),
      data: { inventory: Math.max(0, product.inventory - (line.quantity || 1)) },
      depth: 0,
      overrideAccess: true,
    })
  }
}

/**
 * Receives payment updates from Mercado Pago.
 *
 * This endpoint is the only thing that marks an order paid, so it verifies the
 * `x-signature` HMAC before touching anything: without that, guessing the URL
 * would be enough to complete somebody else's order.
 *
 * @see https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const url = new URL(request.url)

  if (!getMercadoPagoWebhookSecret()) {
    payload.logger.error('[mercadopago] MERCADOPAGO_WEBHOOK_SECRET no está configurado.')

    return Response.json({ message: 'Webhook not configured' }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as MercadoPagoWebhookPayload
  // The signed id is the one in the query string; the body is only a fallback
  // for notification shapes that omit it.
  const dataID = url.searchParams.get('data.id') || String(body.data?.id || '')

  if (
    !verifyMercadoPagoSignature({
      dataID,
      requestID: request.headers.get('x-request-id'),
      signatureHeader: request.headers.get('x-signature'),
    })
  ) {
    return Response.json({ message: 'Invalid signature' }, { status: 401 })
  }

  const paymentID = dataID
  const sellerID = String(body.user_id || '')
  const topic = body.type || url.searchParams.get('type') || 'payment'

  if (!paymentID || topic !== 'payment') {
    return Response.json({ ok: true })
  }

  const profile = sellerID ? await findProfileBySellerID({ payload, sellerID }) : null

  if (!profile) {
    payload.logger.warn(`[mercadopago] notificación sin perfil conocido (user_id: ${sellerID || 'ausente'})`)

    return Response.json({ ok: true })
  }

  let payment: MercadoPagoPaymentResponse

  try {
    payment = await withMercadoPagoAccessToken({
      payload,
      profile,
      run: (accessToken) => fetchMercadoPagoPayment({ accessToken, paymentID }),
    })
  } catch (error) {
    payload.logger.error(
      `[mercadopago] no se pudo leer el pago ${paymentID}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )

    // A 500 makes Mercado Pago retry, which is what we want when the failure is
    // on our side.
    return Response.json({ message: 'Could not read payment' }, { status: 500 })
  }

  const orderID = String(payment.metadata?.orderId || payment.external_reference || '')
  const transactionID = String(payment.metadata?.transactionId || '')
  const processorFeeAmountCOP = resolveProcessorFeeAmountCOP(payment)
  const transactionStatus = mapMercadoPagoPaymentToTransactionStatus(payment.status)
  const orderStatus = mapMercadoPagoPaymentToOrderStatus(payment.status)
  const providerPaymentID = String(payment.id || paymentID)

  if (transactionID) {
    const existing = (await payload
      .findByID({ collection: 'transactions', id: transactionID, depth: 0, overrideAccess: true })
      .catch(() => null)) as null | Transaction

    const alreadyRecorded =
      existing?.paymentProviderPaymentId === providerPaymentID && existing?.status === transactionStatus

    if (!alreadyRecorded) {
      await payload.update({
        collection: 'transactions',
        id: transactionID,
        data: {
          paymentProviderPaymentId: providerPaymentID,
          processorFeeAmountCOP,
          providerEventId: providerPaymentID,
          providerEventType: body.action || topic,
          status: transactionStatus,
        } satisfies Partial<Transaction>,
        depth: 0,
        overrideAccess: true,
      })
    }
  }

  if (orderID) {
    const order = (await payload
      .findByID({ collection: 'orders', id: orderID, depth: 0, overrideAccess: true })
      .catch(() => null)) as null | Order

    if (order) {
      await payload.update({
        collection: 'orders',
        id: orderID,
        data: {
          customerEmail: order.customerEmail || payment.payer?.email || '',
          fulfillmentStatus: resolveFulfillmentStatus(order, payment.status),
          paymentProviderPaymentId: providerPaymentID,
          processorFeeAmountCOP,
          status: orderStatus,
        } satisfies Partial<Order>,
        depth: 0,
        overrideAccess: true,
      })

      if (payment.status === 'approved') {
        await adjustInventoryOnce({ order, payload })
      }
    }
  }

  return Response.json({ ok: true })
}
