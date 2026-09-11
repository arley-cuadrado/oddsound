import type { Payload } from 'payload'

import type { Order } from '@/payload-types'

export type ArtistOrderSummary = {
  buyerEmail: string
  buyerName: string
  carrierName: string
  city: string
  createdAt: string
  fulfillmentStatus: NonNullable<Order['fulfillmentStatus']>
  id: string
  itemCount: number
  netCOP: number
  platformFeeCOP: number
  processorFeeCOP: number
  status: NonNullable<Order['status']>
  totalCOP: number
  trackingNumber: string
}

/**
 * The orders an artist actually needs to act on.
 *
 * Unpaid orders are excluded: a cart abandoned at the Mercado Pago screen leaves
 * a `processing` order behind, and showing those as sales would be misleading.
 */
export async function listArtistOrders({
  limit = 25,
  payload,
  profileID,
}: {
  limit?: number
  payload: Payload
  profileID: string
}): Promise<ArtistOrderSummary[]> {
  const result = await payload.find({
    collection: 'orders',
    depth: 0,
    limit,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: {
      and: [
        { artistProfile: { equals: profileID } },
        { status: { not_equals: 'processing' } },
      ],
    },
  })

  return (result.docs as Order[]).map((order) => ({
    buyerEmail: order.customerEmail || '',
    buyerName: order.shippingAddress?.firstName || '',
    carrierName: order.carrierName || '',
    city: order.shippingAddress?.city || '',
    createdAt: order.createdAt,
    fulfillmentStatus: order.fulfillmentStatus || 'pending_payment',
    id: String(order.id),
    itemCount: (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
    netCOP: Math.max(
      0,
      (order.artistNetAmountCOP || 0) - (order.processorFeeAmountCOP || 0),
    ),
    platformFeeCOP: order.platformFeeAmountCOP || 0,
    processorFeeCOP: order.processorFeeAmountCOP || 0,
    status: order.status || 'completed',
    totalCOP: order.amount || 0,
    trackingNumber: order.trackingNumber || '',
  }))
}
