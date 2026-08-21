import type { Payload, PayloadRequest } from 'payload'

type CreatorLike = {
  accountType?: null | 'artist' | 'band' | 'label'
  editorAccess?: boolean | null
  email?: null | string
  id: string
  name?: null | string
  profile?: null | string | { id?: null | string }
  role?: null | string
}

function getInlineProfileId(user: CreatorLike | null | undefined) {
  if (!user) return null

  return typeof user.profile === 'string' ? user.profile : user.profile?.id || null
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function resolveUniqueProfileSlug(payload: Payload, seed: string) {
  const normalizedSeed = toSlug(seed) || 'creator'
  let candidate = normalizedSeed
  let attempt = 1

  while (true) {
    const existing = await payload.find({
      collection: 'profiles',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        slug: {
          equals: candidate,
        },
      },
    })

    if (existing.docs.length === 0) return candidate

    attempt += 1
    candidate = `${normalizedSeed}-${attempt}`
  }
}

export async function findCreatorProfileByOwner({
  ownerID,
  payload,
}: {
  ownerID: string
  payload: Payload
}) {
  const existingProfiles = await payload.find({
    collection: 'profiles',
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

export async function ensureCreatorProfile({
  payload,
  req,
  user,
}: {
  payload: Payload
  req?: PayloadRequest
  user: CreatorLike
}) {
  if (user.role !== 'creator') return user.profile || null

  const isEditorialProfile = Boolean(user.editorAccess)
  const inlineProfileId = getInlineProfileId(user)

  if (inlineProfileId) {
    if (isEditorialProfile) {
      await payload.update({
        collection: 'profiles',
        id: inlineProfileId,
        data: {
          accountType: null,
          contactEmail: user.email || undefined,
          editorialProfile: true,
        },
        depth: 0,
        overrideAccess: true,
        ...(req ? { req } : {}),
      })
    }

    return inlineProfileId
  }

  const existingProfileId = await findCreatorProfileByOwner({
    ownerID: user.id,
    payload,
  })

  if (existingProfileId) {
    if (isEditorialProfile) {
      await payload.update({
        collection: 'profiles',
        id: existingProfileId,
        data: {
          accountType: null,
          contactEmail: user.email || undefined,
          editorialProfile: true,
        },
        depth: 0,
        overrideAccess: true,
        ...(req ? { req } : {}),
      })
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        profile: existingProfileId,
      },
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })

    return existingProfileId
  }

  const displayName = user.name || user.email?.split('@')[0] || 'New Creator'
  const profileSlug = await resolveUniqueProfileSlug(payload, displayName)

  const profile = await payload.create({
    collection: 'profiles',
    data: {
      ...(isEditorialProfile ? { editorialProfile: true } : {}),
      ...(!isEditorialProfile
        ? {
            accountType: user.accountType === 'band' ? 'band' : 'artist',
          }
        : {}),
      contactEmail: user.email || undefined,
      displayName,
      owner: user.id,
      slug: profileSlug,
    },
    draft: false,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      profile: profile.id,
    },
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  return profile.id
}
