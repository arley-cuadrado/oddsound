import type { Profile } from '@/payload-types'
import type { Payload } from 'payload'

function normalizeSlug(value: string) {
  return value.trim().toLowerCase()
}

export async function findPublicProfileBySlug({
  payload,
  slug,
}: {
  payload: Payload
  slug: string
}): Promise<Profile | null> {
  const normalizedSlug = normalizeSlug(slug)

  const profilesResult = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 5000,
    overrideAccess: true,
    pagination: false,
  })

  const matchedProfile = (profilesResult.docs as Profile[]).find((profile) => {
    return typeof profile.slug === 'string' && normalizeSlug(profile.slug) === normalizedSlug
  })

  if (!matchedProfile?.id) {
    return null
  }

  const profile = await payload.findByID({
    collection: 'profiles',
    id: matchedProfile.id,
    depth: 1,
    overrideAccess: true,
  })

  return profile as Profile
}
