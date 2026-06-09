import { PreviewSearchParams } from '@/app/(frontend)/next/preview/route'
import { PayloadRequest, CollectionSlug } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  id?: number | string
  profile?: unknown
  slug: string
  req: PayloadRequest
}

function extractProfilePreviewValue(profile: Props['profile']) {
  if (!profile) return null

  if (typeof profile === 'object' && profile !== null) {
    if ('slug' in profile && typeof profile.slug === 'string' && profile.slug.trim()) {
      return profile.slug
    }

    if ('id' in profile && (typeof profile.id === 'string' || typeof profile.id === 'number')) {
      return String(profile.id)
    }
  }

  if (typeof profile === 'string' || typeof profile === 'number') {
    return String(profile)
  }

  return null
}

export const generatePreviewPath = ({ collection, id, profile, slug }: Props) => {
  if ((slug === undefined || slug === null) && !(collection === 'pages' && id)) {
    return null
  }

  // Encode to support slugs with special characters
  const encodedSlug = typeof slug === 'string' ? encodeURIComponent(slug) : ''
  const previewParams: PreviewSearchParams =
    collection === 'pages'
      ? {
          collection,
          id: id ? String(id) : null,
          previewSecret: process.env.PREVIEW_SECRET || '',
          profile: extractProfilePreviewValue(profile),
          slug: typeof slug === 'string' ? slug : null,
        }
      : {
          path: `${collectionPrefixMap[collection]}/${encodedSlug}`,
          previewSecret: process.env.PREVIEW_SECRET || '',
        }

  const encodedParams = new URLSearchParams()

  Object.entries(previewParams).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 0) {
      encodedParams.set(key, value)
    }
  })

  const url = `/next/preview?${encodedParams.toString()}`

  return url
}
