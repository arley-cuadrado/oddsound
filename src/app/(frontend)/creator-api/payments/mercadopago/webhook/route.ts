import config from '@payload-config'
import { getPayload } from 'payload'

import type { Order, Profile, Transaction } from '@/payload-types'
import {
  fetchMercadoPagoPayment,
  mapMercadoPagoPaymentToOrderStatus,
  mapMercadoPagoPaymentToTransactionStatus,
  resolveProcessorFeeAmountCOP,
} from '@/utilities/mercadoPagoCheckout'
import { getDecryptedMercadoPagoAccessToken } from '@/utilities/mercadoPagoOAuth'

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

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const url = new URL(request.url)
  const expectedToken = process.env.MERCADOPAGO_WEBHOOK_TOKEN || ''
  const providedToken = url.searchParams.get('token') || ''

  if (expectedToken && providedToken !== expectedToken) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as MercadoPagoWebhookPayload
  const paymentID = String(body.data?.id || '')
  const sellerID = String(body.user_id || '')

  if (!paymentID || (body.type && body.type !== 'payment')) {
    return Response.json({ ok: true })
  }

  const profile = sellerID
    ? await findProfileBySellerID({
        payload,
        sellerID,
      })
    : null

  if (!profile) {
    return Response.json({ ok: true })
  }

  const accessToken = getDecryptedMercadoPagoAccessToken(profile)

  if (!accessToken) {
    return Response.json({ ok: true })
  }

  const payment = await fetchMercadoPagoPayment({
    accessToken,
    paymentID,
  })

  const orderID = String(payment.metadata?.orderId || payment.external_reference || '')
  const transactionID = String(payment.metadata?.transactionId || '')

  const processorFeeAmountCOP = resolveProcessorFeeAmountCOP(payment)
  const transactionStatus = mapMercadoPagoPaymentToTransactionStatus(payment.status)
  const orderStatus = mapMercadoPagoPaymentToOrderStatus(payment.status)

  if (transactionID) {
    await payload.update({
      collection: 'transactions',
      id: transactionID,
      data: {
        paymentProviderPaymentId: String(payment.id || paymentID),
        processorFeeAmountCOP,
        providerEventId: String(payment.id || paymentID),
        providerEventType: body.action || body.type || 'payment',
        status: transactionStatus,
      } satisfies Partial<Transaction>,
      depth: 0,
      overrideAccess: true,
    })
  }

  if (orderID) {
    const order = (await payload.findByID({
      collection: 'orders',
      id: orderID,
      depth: 0,
      overrideAccess: true,
    }).catch(() => null)) as Order | null

    if (order) {
      const fulfillmentStatus =
        payment.status === 'approved'
          ? order.fulfillmentStatus === 'not_required'
            ? 'not_required'
            : 'ready_to_ship'
          : payment.status === 'refunded'
            ? 'refunded'
            : payment.status === 'cancelled' || payment.status === 'rejected'
              ? 'cancelled'
              : order.fulfillmentStatus || 'pending_payment'

      await payload.update({
        collection: 'orders',
        id: orderID,
        data: {
          fulfillmentStatus,
          paymentProviderPaymentId: String(payment.id || paymentID),
          processorFeeAmountCOP,
          status: orderStatus,
        } satisfies Partial<Order>,
        depth: 0,
        overrideAccess: true,
      })
    }
  }

  return Response.json({ ok: true })
}

export async function GET(request: Request) {
  return POST(request)
}

