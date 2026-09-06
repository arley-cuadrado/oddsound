import type { CollectionAfterChangeHook, CollectionAfterReadHook } from 'payload'

import { hasEditorialIdentity, isMusicalCreatorUser } from '@/utilities/isEditorialUser'
import type { User } from '@/payload-types'

type Relation = null | number | string | { id?: null | number | string }
type CreatorAccountFields = {
  accountAvatar?: Relation
  editorBio?: null | string
  editorSocialLink?: {
    label?: null | string
    url?: null | string
  } | null
  genre?: null | string
  location?: null | string
}

function isProfileAccountUser(user: unknown) {
  return isMusicalCreatorUser(user) || hasEditorialIdentity(user)
}

function getRelationID(value: Relation | undefined) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && value.id) return String(value.id)

  return null
}

async function resolveProfileID({
  payload,
  profile,
  userID,
}: {
  payload: any
  profile: Relation | undefined
  userID: number | string
}) {
  const linkedProfileID = getRelationID(profile)
  if (linkedProfileID) return linkedProfileID

  const result = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      owner: {
        equals: userID,
      },
    },
  })

  return result.docs[0]?.id ? String(result.docs[0].id) : null
}

export const populateCreatorAccountProfile: CollectionAfterReadHook<User> = async ({
  doc,
  req,
}) => {
  if (!doc || String(req.user?.id) !== String(doc.id) || !isProfileAccountUser(doc)) return doc

  const account = doc as typeof doc & CreatorAccountFields

  const profileID = await resolveProfileID({
    payload: req.payload,
    profile: account.profile as Relation,
    userID: account.id,
  })
  if (!profileID) return doc

  const profile = await req.payload.findByID({
    collection: 'profiles',
    depth: 0,
    id: profileID,
    overrideAccess: true,
  })

  const accountData = {
    ...doc,
    accountAvatar: account.accountAvatar ?? profile.avatar ?? null,
  }

  if (hasEditorialIdentity(doc)) {
    return {
      ...accountData,
      editorBio: account.editorBio ?? profile.bio ?? null,
      editorSocialLink: account.editorSocialLink ?? profile.editorSocialLink ?? {},
    }
  }

  return {
    ...accountData,
    genre: account.genre ?? profile.genre ?? null,
    location: account.location ?? profile.location ?? null,
  }
}

export const syncCreatorAccountProfile: CollectionAfterChangeHook<User> = async ({
  data,
  doc,
  operation,
  req,
}) => {
  if (operation !== 'update' || !isProfileAccountUser(doc)) return doc

  const account = doc as typeof doc & CreatorAccountFields

  const profileID = await resolveProfileID({
    payload: req.payload,
    profile: account.profile as Relation,
    userID: account.id,
  })
  if (!profileID) return doc

  const profileData: Record<string, unknown> = {}

  if ('name' in data) profileData.displayName = doc.name
  if (isMusicalCreatorUser(doc) && 'accountType' in data) {
    profileData.accountType = doc.accountType
    profileData.profileType = doc.accountType
  }
  if ('accountAvatar' in data) profileData.avatar = account.accountAvatar || null
  if (isMusicalCreatorUser(doc) && 'location' in data) profileData.location = account.location || null
  if (isMusicalCreatorUser(doc) && 'genre' in data) profileData.genre = account.genre || null
  if (hasEditorialIdentity(doc) && 'editorBio' in data) profileData.bio = account.editorBio || null
  if (hasEditorialIdentity(doc) && 'editorSocialLink' in data) {
    profileData.editorSocialLink = account.editorSocialLink || {}
  }
  if ('email' in data) profileData.contactEmail = doc.email

  if (Object.keys(profileData).length === 0) return doc

  await req.payload.update({
    collection: 'profiles',
    data: profileData,
    depth: 0,
    id: profileID,
    overrideAccess: true,
    req,
  })

  return doc
}
