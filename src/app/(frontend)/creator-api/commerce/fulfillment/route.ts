import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import type { Order } from '@/payload-types'
import { resolveUserProfileID } from '@/utilities/commerceProducts'
import { isAdminUser } from '@/utilities/isAdminUser'

const ALLOWED_STATUSES = ['delivered', 'ready_to_ship', 'shipped'] as const

type AllowedStatus = (typeof ALLOWED_STATUSES)[number]

/**
 * Lets an artist move their own order along and attach a tracking number.
 *
 * Scoped to the caller's profile: an artist can only touch orders that were
 * placed with them, never another seller's.
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    return Response.json({ message: 'Authentication required.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const orderID = String(body.orderID || '')
  const status = String(body.fulfillmentStatus || '') as AllowedStatus

  if (!orderID || !ALLOWED_STATUSES.includes(status)) {
    return Response.json({ message: 'Datos incompletos.' }, { status: 400 })
  }

  const order = (await payload
    .findByID({ collection: 'orders', id: orderID, depth: 0, overrideAccess: true })
    .catch(() => null)) as null | Order

  if (!order) {
    return Response.json({ message: 'No encontramos ese pedido.' }, { status: 404 })
  }

  const orderProfileID =
    typeof order.artistProfile === 'string'
      ? order.artistProfile
      : order.artistProfile?.id
        ? String(order.artistProfile.id)
        : null

  if (!isAdminUser(user) && orderProfileID !== resolveUserProfileID(user as never)) {
    return Response.json({ message: 'Este pedido no es tuyo.' }, { status: 403 })
  }

  if (order.status !== 'completed') {
    return Response.json({ message: 'Este pedido todavía no está pagado.' }, { status: 409 })
  }

  const updated = (await payload.update({
    collection: 'orders',
    id: orderID,
    data: {
      carrierName: typeof body.carrierName === 'string' ? body.carrierName.trim().slice(0, 120) : order.carrierName,
      fulfillmentStatus: status,
      trackingNumber:
        typeof body.trackingNumber === 'string'
          ? body.trackingNumber.trim().slice(0, 120)
          : order.trackingNumber,
    },
    depth: 0,
    overrideAccess: true,
  })) as Order

  return Response.json({
    order: {
      carrierName: updated.carrierName ?? '',
      fulfillmentStatus: updated.fulfillmentStatus,
      trackingNumber: updated.trackingNumber ?? '',
    },
  })
}
