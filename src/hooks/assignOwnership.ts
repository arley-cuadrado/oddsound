import type { CollectionBeforeChangeHook } from 'payload'
import { ensureCreatorProfile, findCreatorProfileByOwner } from '@/utilities/creatorProfiles'
import { isAdminUser } from '@/utilities/isAdminUser'

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

  const profileId = await resolveUserProfileId(req)
  const ensuredProfileId =
    profileId ||
    (isAdminUser(req.user)
      ? await ensureCreatorProfile({
          payload: req.payload,
          req,
          user: {
            email: req.user.email,
            id: String(req.user.id),
            name: req.user.name,
            profile: req.user.profile,
            role: req.user.role,
            userType: (req.user as { userType?: null | string }).userType,
          },
        })
      : null)

  if (isAdminUser(req.user)) {
    return {
      ...data,
      owner: req.user.id,
      ...(ensuredProfileId ? { profile: ensuredProfileId } : {}),
    }
  }

  return {
    ...data,
    owner: req.user.id,
    ...(ensuredProfileId ? { profile: ensuredProfileId } : {}),
  }
}
