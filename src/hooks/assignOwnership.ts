import type { CollectionBeforeChangeHook } from 'payload'
import { isAdminUser } from '@/utilities/isAdminUser'

async function resolveUserProfileId(req: Parameters<CollectionBeforeChangeHook>[0]['req']) {
  const user = req.user

  if (!user) return null

  if (typeof user.profile === 'string' || typeof user.profile === 'number') {
    return user.profile
  }

  if (user.profile && typeof user.profile === 'object' && 'id' in user.profile) {
    return user.profile.id
  }

  const freshUser = await req.payload.findByID({
    collection: 'users',
    id: user.id,
    depth: 0,
  })

  if (typeof freshUser.profile === 'string' || typeof freshUser.profile === 'number') {
    return freshUser.profile
  }

  if (freshUser.profile && typeof freshUser.profile === 'object' && 'id' in freshUser.profile) {
    return freshUser.profile.id
  }

  const profiles = await req.payload.find({
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

  return profiles.docs[0]?.id || null

}

export const assignOwnership: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!req.user || isAdminUser(req.user)) return data

  const profileId = await resolveUserProfileId(req)

  return {
    ...data,
    owner: req.user.id,
    ...(profileId ? { profile: profileId } : {}),
  }
}
