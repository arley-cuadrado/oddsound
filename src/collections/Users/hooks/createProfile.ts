import type { CollectionAfterOperationHook } from 'payload'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function resolveUniqueProfileSlug(req: Parameters<CollectionAfterOperationHook<'users'>>[0]['req'], seed: string) {
  const normalizedSeed = toSlug(seed) || 'creator'
  let candidate = normalizedSeed
  let attempt = 1

  while (true) {
    const existing = await req.payload.find({
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

export const createProfile: CollectionAfterOperationHook<'users'> = async ({
  operation,
  req,
  result,
}) => {
  if (operation !== 'create') return result
  if (!result || typeof result !== 'object' || !('role' in result)) return result
  if (result.role !== 'creator') return result
  if (result.profile) return result

  const displayName = result.name || result.email?.split('@')[0] || 'New Creator'

  const profileSlug = await resolveUniqueProfileSlug(req, displayName)

  const profile = await req.payload.create({
    collection: 'profiles',
    data: {
      accountType: result.accountType || 'artist',
      contactEmail: result.email,
      displayName,
      owner: result.id,
      slug: profileSlug,
    },
    draft: false,
    overrideAccess: true,
  })

  await req.payload.db.collections.users.findByIdAndUpdate(result.id, {
    $set: {
      profile: profile.id,
    },
  })

  return {
    ...result,
    profile: profile.id,
  }
}
