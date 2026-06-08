import type { Where } from 'payload'

export function buildPublicSlugWhere(slug: string): Where {
  const normalizedSlug = slug.trim().toLowerCase()

  if (slug === normalizedSlug) {
    return {
      slug: {
        equals: slug,
      },
    } as Where
  }

  return {
    or: [
      {
        slug: {
          equals: slug,
        },
      },
      {
        slug: {
          equals: normalizedSlug,
        },
      },
    ],
  } as Where
}

export function normalizePublicSlugParam(slug: string) {
  return decodeURIComponent(slug).trim()
}
