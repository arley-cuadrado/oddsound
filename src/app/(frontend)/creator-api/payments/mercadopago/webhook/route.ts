import config from '@payload-config'
import { getPayload } from 'payload'

import { getMarketplaceSettings } from '@/utilities/marketplaceSettings'
import { getMercadoPagoPayment } from '@/utilities/mercadoPago'
import { getSellerAccessToken } from '@/utilities/marketplaceSellerAccounts'

function mapPaymentStatus(status?: null | string) {
  switch (status) {
    case 'approved':
      return {
        orderStatus: 'processing' as const,
        transactionStatus: 'succeeded' as const,
      }
    case 'refunded':
      return {
        orderStatus: 'refunded' as const,
        transactionStatus: 'refunded' as const,
      }
    case 'cancelled':
    case 'rejected':
      return {
        orderStatus: 'cancelled' as const,
        transactionStatus: 'cancelled' as const,
      }
    default:
      return {
        orderStatus: null,
        transactionStatus: 'pending' as const,
      }
  }
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const url = new URL(request.url)
  const orderId = url.searchParams.get('orderId')
  const sellerAccountId = url.searchParams.get('sellerAccountId')
  const token = url.searchParams.get('token')
  const transactionId = url.searchParams.get('transactionId')
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string
        data?: { id?: string | number }
        id?: string | number
        topic?: string
        type?: string
      }
    | null

  const settings = await getMarketplaceSettings(payload)

  if (settings.webhookAuthToken && token !== settings.webhookAuthToken) {
    return Response.json({ message: 'Invalid webhook token.' }, { status: 401 })
  }

  if (!orderId || !sellerAccountId || !transactionId) {
    return Response.json({ message: 'Missing internal routing parameters.' }, { status: 400 })
  }

  const eventType = body?.type || body?.topic || 'unknown'
  const eventID = body?.id ? String(body.id) : null
  const paymentID = body?.data?.id ? String(body.data.id) : body?.id ? String(body.id) : null

  if (!paymentID) {
    return Response.json({ ok: true, ignored: true })
  }

  const sellerAccount = await payload.findByID({
    collection: 'seller-payment-accounts',
    id: sellerAccountId,
    depth: 0,
    overrideAccess: true,
  })
  const sellerAccessToken = getSellerAccessToken(sellerAccount)

  if (!sellerAccessToken) {
    return Response.json({ message: 'Missing seller access token.' }, { status: 400 })
  }

  const payment = await getMercadoPagoPayment({
    accessToken: sellerAccessToken,
    paymentID,
  })
  const status = mapPaymentStatus(payment.status)
  const processorFeeAmountCOP =
    payment.fee_details?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0

  await payload.update({
    collection: 'transactions',
    id: transactionId,
    data: {
      paymentProviderPaymentId: payment.id ? String(payment.id) : paymentID,
      processorFeeAmountCOP,
      providerEventId: eventID,
      providerEventType: eventType,
      status: status.transactionStatus,
    },
    overrideAccess: true,
  })

  await payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      ...(status.orderStatus ? { status: status.orderStatus } : {}),
      paymentProviderPaymentId: payment.id ? String(payment.id) : paymentID,
      processorFeeAmountCOP,
      ...(status.transactionStatus === 'succeeded'
        ? {
            fulfillmentStatus: 'ready_to_ship',
          }
        : {}),
      ...(status.transactionStatus === 'refunded'
        ? {
            fulfillmentStatus: 'refunded',
          }
        : {}),
      ...(status.transactionStatus === 'cancelled'
        ? {
            fulfillmentStatus: 'cancelled',
          }
        : {}),
    },
    overrideAccess: true,
  })

  return Response.json({ ok: true })
}
