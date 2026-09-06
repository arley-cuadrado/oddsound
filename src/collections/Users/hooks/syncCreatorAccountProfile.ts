import type {
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
} from 'payload'

import { hasEditorialIdentity, isMusicalCreatorUser } from '@/utilities/isEditorialUser'
import type { User } from '@/payload-types'

type Relation = null | number | string | { id?: null | number | string }
type CreatorAccountFields = {
  advancedAccountAvatar?: Relation
  advancedAccountType?: null | 'artist' | 'band'
  advancedGenre?: null | string
  advancedLocation?: null | string
  accountAvatar?: Relation
  biographyHero?: {
    media?: Relation
    type?: null | string
  } | null
  biographyLayout?: unknown
  biographySocialLinks?: unknown
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

async function resolveMedia(avatar: Relation | undefined, payload: any) {
  const avatarID = getRelationID(avatar)
  if (!avatarID || (avatar && typeof avatar === 'object' && ('url' in avatar || 'thumbnailURL' in avatar))) {
    return avatar || null
  }

  return payload.findByID({
    collection: 'media',
    depth: 0,
    id: avatarID,
    overrideAccess: true,
  })
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

async function resolveBiography({ payload, userID }: { payload: any; userID: number | string }) {
  const result = await payload.find({
    collection: 'biographies',
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

  return result.docs[0] || null
}

// Virtual Account fields make the artist dashboard a single editing surface.
// Persist their values in the existing user fields before profile synchronization.
export const applyCreatorAccountAdvancedFields: CollectionBeforeChangeHook<User> = ({
  data,
  originalDoc,
}) => {
  if (!isMusicalCreatorUser({ ...originalDoc, ...data })) return data

  const nextData = { ...(data || {}) } as CreatorAccountFields

  if ('advancedAccountType' in nextData) nextData.accountType = nextData.advancedAccountType
  if ('advancedAccountAvatar' in nextData) nextData.accountAvatar = nextData.advancedAccountAvatar
  if ('advancedLocation' in nextData) nextData.location = nextData.advancedLocation
  if ('advancedGenre' in nextData) nextData.genre = nextData.advancedGenre

  return nextData
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

  const accountAvatar = await resolveMedia(account.accountAvatar ?? profile.avatar, req.payload)

  const accountData = {
    ...doc,
    accountAvatar,
  }

  if (hasEditorialIdentity(doc)) {
    return {
      ...accountData,
      editorBio: account.editorBio ?? profile.bio ?? null,
      editorSocialLink: account.editorSocialLink ?? profile.editorSocialLink ?? {},
    }
  }

  const biography = await resolveBiography({
    payload: req.payload,
    userID: account.id,
  })

  return {
    ...accountData,
    advancedAccountAvatar: accountData.accountAvatar,
    advancedAccountType: account.accountType ?? profile.accountType ?? profile.profileType ?? 'artist',
    advancedGenre: account.genre ?? profile.genre ?? null,
    advancedLocation: account.location ?? profile.location ?? null,
    biographyHero: biography?.hero ?? { type: 'mediumImpact' },
    biographyLayout: biography?.layout ?? [],
    biographySocialLinks: biography?.socialLinks ?? [],
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

  if (Object.keys(profileData).length > 0) {
    await req.payload.update({
      collection: 'profiles',
      data: profileData,
      depth: 0,
      id: profileID,
      overrideAccess: true,
      req,
    })
  }

  if (!isMusicalCreatorUser(doc)) return doc

  const accountInput = data as CreatorAccountFields
  const biographyData: Record<string, unknown> = {}

  if ('biographyHero' in accountInput) {
    biographyData.hero = accountInput.biographyHero || { type: 'mediumImpact' }
  }
  if ('biographyLayout' in accountInput) biographyData.layout = accountInput.biographyLayout || []
  if ('biographySocialLinks' in accountInput) {
    biographyData.socialLinks = accountInput.biographySocialLinks || []
  }

  if (Object.keys(biographyData).length === 0) return doc

  const biography = await resolveBiography({ payload: req.payload, userID: account.id })

  if (biography) {
    await req.payload.update({
      collection: 'biographies',
      data: biographyData,
      depth: 0,
      id: biography.id,
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({
      collection: 'biographies',
      data: {
        ...biographyData,
        owner: account.id,
        profile: profileID,
        title: doc.name,
      },
      depth: 0,
      overrideAccess: true,
      req,
    })
  }

  return doc
}
