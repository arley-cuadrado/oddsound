import type { BeforeListServerProps } from 'payload'
import { redirect } from 'next/navigation'

import config from '@payload-config'
import { getPayload } from 'payload'

type CreatorUser = {
  id?: null | string
  role?: null | string
}

export default async function CreatorProfileListRedirect({ req }: BeforeListServerProps) {
  const user = req.user as CreatorUser | null

  if (user?.role !== 'creator' || !user.id) {
    return null
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      owner: {
        equals: user.id,
      },
    },
  })

  const profileID = result.docs[0]?.id

  if (profileID) {
    redirect(`/dashboard/collections/profiles/${profileID}`)
  }

  return null
}
