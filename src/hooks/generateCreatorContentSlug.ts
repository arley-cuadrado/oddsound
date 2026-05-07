import type { CollectionBeforeChangeHook } from 'payload'

type SupportedCollection = 'pages' | 'posts'

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildDateSegment(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())

  return `${day}${month}${year}`
}

async function resolveCreatorSlug(req: Parameters<CollectionBeforeChangeHook>[0]['req']) {
  const user = req.user

  if (!user) return 'creator'

  const inlineProfile = user.profile

  if (inlineProfile && typeof inlineProfile === 'object' && 'slug' in inlineProfile && inlineProfile.slug) {
    return slugifySegment(String(inlineProfile.slug)) || 'creator'
  }

  const profileID =
    typeof inlineProfile === 'string' || typeof inlineProfile === 'number'
      ? inlineProfile
      : inlineProfile && typeof inlineProfile === 'object' && 'id' in inlineProfile
        ? inlineProfile.id
        : null

  if (!profileID) {
    const userNameSlug =
      typeof user.name === 'string' && user.name.trim() ? slugifySegment(user.name) : ''
    if (userNameSlug) return userNameSlug

    const emailSlug =
      typeof user.email === 'string' && user.email.includes('@')
        ? slugifySegment(user.email.split('@')[0] || '')
        : ''

    return emailSlug || 'creator'
  }

  try {
    const profile = await req.payload.findByID({
      collection: 'profiles',
      id: profileID,
      depth: 0,
      overrideAccess: true,
    })

    if (profile?.slug) return slugifySegment(profile.slug) || 'creator'
  } catch {
    const userNameSlug =
      typeof user.name === 'string' && user.name.trim() ? slugifySegment(user.name) : ''
    if (userNameSlug) return userNameSlug

    const emailSlug =
      typeof user.email === 'string' && user.email.includes('@')
        ? slugifySegment(user.email.split('@')[0] || '')
        : ''

    return emailSlug || 'creator'
  }

  const userNameSlug =
    typeof user.name === 'string' && user.name.trim() ? slugifySegment(user.name) : ''
  if (userNameSlug) return userNameSlug

  const emailSlug =
    typeof user.email === 'string' && user.email.includes('@')
      ? slugifySegment(user.email.split('@')[0] || '')
      : ''

  return emailSlug || 'creator'
}

async function ensureUniqueSlug(args: {
  baseSlug: string
  collection: SupportedCollection
  currentID?: number | string
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
}) {
  const { baseSlug, collection, currentID, req } = args

  let candidate = baseSlug
  let suffix = 2

  while (true) {
    const existing = await req.payload.find({
      collection,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          {
            slug: {
              equals: candidate,
            },
          },
          ...(currentID
            ? [
                {
                  id: {
                    not_equals: currentID,
                  },
                },
              ]
            : []),
        ],
      },
    })

    if (existing.docs.length === 0) return candidate

    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

export function generateCreatorContentSlug(collection: SupportedCollection): CollectionBeforeChangeHook {
  return async ({ data, operation, originalDoc, req }) => {
    if (operation !== 'create' && operation !== 'update') return data

    const nextData = { ...data }

    if (nextData.slug && String(nextData.slug).trim()) return nextData

    if (operation === 'update' && originalDoc?.slug && !nextData.slug) {
      nextData.slug = originalDoc.slug
      return nextData
    }

    const creatorSlug = await resolveCreatorSlug(req)
    const title =
      typeof nextData.title === 'string' && nextData.title.trim()
        ? nextData.title
        : collection === 'posts'
          ? 'post'
          : 'page'

    const titleSegment = slugifySegment(title) || (collection === 'posts' ? 'post' : 'page')
    const dateSegment = buildDateSegment()
    const baseSlug = `${creatorSlug}-${titleSegment}-${dateSegment}`

    const currentID =
      typeof originalDoc?.id === 'string' || typeof originalDoc?.id === 'number'
        ? originalDoc.id
        : undefined

    nextData.slug = await ensureUniqueSlug({
      baseSlug,
      collection,
      currentID,
      req,
    })
    nextData.generateSlug = false

    return nextData
  }
}
