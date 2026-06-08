import type { BeforeListServerProps } from 'payload'
import { redirect } from 'next/navigation'

type CreatorUser = {
  id?: null | string
  role?: null | string
}

export default async function CreatorProfileListRedirect({
  payload,
  user,
}: BeforeListServerProps) {
  const creatorUser = user as CreatorUser | null

  if (creatorUser?.role !== 'creator' || !creatorUser.id) {
    return null
  }

  const result = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      owner: {
        equals: creatorUser.id,
      },
    },
  })

  const profileID = result.docs[0]?.id

  if (profileID) {
    redirect(`/dashboard/collections/profiles/${profileID}`)
  }

  return null
}
