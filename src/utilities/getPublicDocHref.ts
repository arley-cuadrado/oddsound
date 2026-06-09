function getDocSlug(value: unknown) {
  if (!value || typeof value !== 'object') return null
  return typeof (value as { slug?: unknown }).slug === 'string'
    ? ((value as { slug: string }).slug || null)
    : null
}

function getProfileSlug(value: unknown) {
  if (!value || typeof value !== 'object') return null

  const profile = (value as { profile?: unknown }).profile

  if (!profile || typeof profile !== 'object') return null

  return typeof (profile as { slug?: unknown }).slug === 'string'
    ? ((profile as { slug: string }).slug || null)
    : null
}

export function getPublicDocHref(args: {
  relationTo: string
  value: unknown
}) {
  const { relationTo, value } = args
  const slug = getDocSlug(value)

  if (!slug) return null

  if (relationTo === 'posts') {
    return `/posts/${slug}`
  }

  const profileSlug = getProfileSlug(value)

  return profileSlug ? `/${profileSlug}/release/${slug}` : `/${slug}`
}
