import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import type { Profile } from '@/payload-types'
import { resolveUserProfileID } from '@/utilities/commerceProducts'

const MAX_NOTES_LENGTH = 400

/** Lets an artist set their own flat shipping rate from the creator dashboard. */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    return Response.json({ message: 'Authentication required.' }, { status: 401 })
  }

  const profileID = resolveUserProfileID(user as never)

  if (!profileID) {
    return Response.json({ message: 'No creator profile found for this user.' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const rawRate = Number(body.shippingFlatRateCOP)

  if (!Number.isFinite(rawRate) || rawRate < 0) {
    return Response.json({ message: 'Ingresa un costo de envío válido.' }, { status: 400 })
  }

  const notes = typeof body.shippingNotes === 'string' ? body.shippingNotes.trim() : ''

  const updated = (await payload.update({
    collection: 'profiles',
    id: profileID,
    data: {
      commerce: {
        shippingFlatRateCOP: Math.round(rawRate),
        shippingNotes: notes.slice(0, MAX_NOTES_LENGTH),
      },
    },
    depth: 0,
    overrideAccess: true,
  })) as Profile

  return Response.json({
    commerce: {
      shippingFlatRateCOP: updated.commerce?.shippingFlatRateCOP ?? 0,
      shippingNotes: updated.commerce?.shippingNotes ?? '',
    },
  })
}
