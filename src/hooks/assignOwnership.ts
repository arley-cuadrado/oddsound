import type { CollectionBeforeChangeHook } from 'payload'
import { isAdminUser } from '@/utilities/isAdminUser'
import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'

type RequestContextWithProfileCache = {
  creatorProfileIdByOwner?: Map<string | number, null | string>
}

async function resolveUserProfileId(req: Parameters<CollectionBeforeChangeHook>[0]['req']) {
  const user = req.user

  if (!user) return null

  if (typeof user.profile === 'string' || typeof user.profile === 'number') {
    return user.profile
  }

  if (user.profile && typeof user.profile === 'object' && 'id' in user.profile) {
    return user.profile.id
  }

  const context = (req.context || {}) as RequestContextWithProfileCache
  const cache = context.creatorProfileIdByOwner || new Map<string | number, null | string>()

  context.creatorProfileIdByOwner = cache

  if (cache.has(user.id)) {
    return cache.get(user.id) || null
  }

  const profileId = await findCreatorProfileByOwner({
    ownerID: String(user.id),
    payload: req.payload,
  })

  cache.set(user.id, profileId)

  return profileId
}

export const assignOwnership: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!req.user) return data

  if (isAdminUser(req.user)) {
    return {
      ...data,
      owner: req.user.id,
    }
  }

  const profileId = await resolveUserProfileId(req)

  return {
    ...data,
    owner: req.user.id,
    ...(profileId ? { profile: profileId } : {}),
  }
}
