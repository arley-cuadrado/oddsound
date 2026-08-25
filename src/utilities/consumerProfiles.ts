import type { Payload, PayloadRequest } from 'payload'

type ConsumerLike = {
  avatar?: null | string
  consumerProfile?: null | string | { id?: null | string }
  email?: null | string
  id: string
  name?: null | string
  userType?: null | string
}

function getInlineConsumerProfileId(user: ConsumerLike | null | undefined) {
  if (!user) return null

  return typeof user.consumerProfile === 'string' ? user.consumerProfile : user.consumerProfile?.id || null
}

export async function findConsumerProfileByOwner({
  ownerID,
  payload,
}: {
  ownerID: string
  payload: Payload
}) {
  const existingProfiles = await payload.find({
    collection: 'consumerProfiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      owner: {
        equals: ownerID,
      },
    },
  })

  return existingProfiles.docs[0]?.id || null
}

export async function ensureConsumerProfile({
  payload,
  req,
  user,
}: {
  payload: Payload
  req?: PayloadRequest
  user: ConsumerLike
}) {
  if (user.userType !== 'consumer' && user.userType !== 'fan') return user.consumerProfile || null

  const inlineProfileId = getInlineConsumerProfileId(user)

  if (inlineProfileId) {
    await payload.update({
      collection: 'consumerProfiles',
      id: inlineProfileId,
      data: {
        avatar: user.avatar || undefined,
        displayName: user.name || user.email?.split('@')[0] || 'Fan',
        email: user.email || '',
      },
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })

    return inlineProfileId
  }

  const existingProfileId = await findConsumerProfileByOwner({
    ownerID: user.id,
    payload,
  })

  if (existingProfileId) {
    await payload.update({
      collection: 'consumerProfiles',
      id: existingProfileId,
      data: {
        avatar: user.avatar || undefined,
        displayName: user.name || user.email?.split('@')[0] || 'Fan',
        email: user.email || '',
      },
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        consumerProfile: existingProfileId,
      },
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })

    return existingProfileId
  }

  const displayName = user.name || user.email?.split('@')[0] || 'New Fan'

  const profile = await payload.create({
    collection: 'consumerProfiles',
    data: {
      avatar: user.avatar || undefined,
      displayName,
      email: user.email || '',
      owner: user.id,
      status: 'active',
    },
    draft: false,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      consumerProfile: profile.id,
    },
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  return profile.id
}
