import config from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { listCommerceProducts, resolveUserProfileID } from '@/utilities/commerceProducts'
import { isAdminUser } from '@/utilities/isAdminUser'

export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { searchParams } = new URL(request.url)
  const includeDrafts = searchParams.get('status') === 'all'
  const requestedProfile = searchParams.get('profile')
  const requestedRelease = searchParams.get('release')
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return Response.json({ message: 'Authentication required.' }, { status: 401 })
  }

  const isAdmin = isAdminUser(user)
  const ownerID = isAdmin ? null : String(user.id)
  const ownProfileID = resolveUserProfileID(user as never)
  const profileFilter = isAdmin ? requestedProfile : requestedProfile || ownProfileID

  if (!isAdmin && !ownProfileID) {
    return Response.json({ message: 'No creator profile found for this user.' }, { status: 400 })
  }

  const products = await listCommerceProducts({
    includeDrafts: isAdmin ? includeDrafts : true,
    ownerID,
    payload,
    profile: profileFilter,
    release: requestedRelease,
  })

  return Response.json({
    products,
    scope: {
      includeDrafts: isAdmin ? includeDrafts : true,
      ownerOnly: !isAdmin,
      profile: profileFilter,
      release: requestedRelease,
    },
  })
}
