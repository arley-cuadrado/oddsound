import type { BeforeListServerProps } from 'payload'
import { redirect } from 'next/navigation'

import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'
import { isMusicalCreatorUser } from '@/utilities/isEditorialUser'

type CreatorUser = {
  editorAccess?: boolean | null
  email?: null | string
  id?: null | string
  name?: null | string
  role?: null | string
}

export default async function CreatorBiographyListRedirect({
  payload,
  user,
}: BeforeListServerProps) {
  const creatorUser = user as CreatorUser | null

  if (!isMusicalCreatorUser(creatorUser) || !creatorUser?.id) {
    return null
  }

  const existingBiography = await payload.find({
    collection: 'biographies',
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

  let biographyID = existingBiography.docs[0]?.id

  if (!biographyID) {
    const profileID = await findCreatorProfileByOwner({
      ownerID: String(creatorUser.id),
      payload,
    })

    const title = creatorUser.name || creatorUser.email?.split('@')[0] || 'Biografía'

    const createdBiography = await payload.create({
      collection: 'biographies',
      data: {
        hero: {
          type: 'mediumImpact',
        },
        layout: [],
        owner: creatorUser.id,
        ...(profileID ? { profile: profileID } : {}),
        title,
      },
      depth: 0,
      overrideAccess: true,
    })

    biographyID = createdBiography.id
  }

  if (biographyID) {
    redirect(`/dashboard/collections/biographies/${biographyID}`)
  }

  return null
}
