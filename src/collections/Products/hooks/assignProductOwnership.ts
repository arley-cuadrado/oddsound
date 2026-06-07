import type { CollectionBeforeChangeHook } from 'payload'

import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'
import { isAdminUser } from '@/utilities/isAdminUser'

export const assignProductOwnership: CollectionBeforeChangeHook = async ({ data, req }) => {
  const user = req.user

  if (!user) return data

  if (isAdminUser(user)) {
    return data
  }

  const profileID = await findCreatorProfileByOwner({
    ownerID: String(user.id),
    payload: req.payload,
  })

  if (!profileID) {
    throw new Error('No encontramos un perfil asociado a este creador.')
  }

  return {
    ...data,
    owner: user.id,
    profile: profileID,
  }
}
