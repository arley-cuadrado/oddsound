import configPromise from '@payload-config'
import type { Media, Page, Profile } from '@/payload-types'
import { getPayload } from 'payload'

import ReleasesHome from './ReleasesHome'
import type { ReleaseItem } from './types'

const FALLBACK_RELEASE_IMAGE = '/home-images/hero.jpeg'

function extractRichTextText(
  node: null | {
    root?: {
      children?: unknown[]
    }
  },
) {
  if (!node?.root?.children) return ''

  const values: string[] = []

  const visit = (current: unknown) => {
    if (!current || typeof current !== 'object') return

    const candidate = current as { children?: unknown[]; text?: string }

    if (typeof candidate.text === 'string') {
      values.push(candidate.text)
    }

    if (Array.isArray(candidate.children)) {
      candidate.children.forEach(visit)
    }
  }

  node.root.children.forEach(visit)

  return values.join(' ').replace(/\s+/g, ' ').trim()
}

function extractLayoutText(page: Page) {
  if (!Array.isArray(page.layout)) return ''

  const snippets = page.layout.flatMap((block) => {
    if (!block || typeof block !== 'object') return []

    if (block.blockType === 'content' && Array.isArray(block.columns)) {
      return block.columns
        .map((column) => extractRichTextText(column?.richText || null))
        .filter(Boolean)
    }

    return []
  })

  return snippets.join(' ').replace(/\s+/g, ' ').trim()
}

function removeRepeatedTitle(text: string, title: string) {
  if (!text) return ''

  const normalizedTitle = title.trim().toLowerCase()
  const normalizedText = text.trim().toLowerCase()

  if (normalizedText === normalizedTitle) return ''

  const titlePattern = new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s-]*`, 'i')

  return text.replace(titlePattern, '').trim()
}

function getMediaUrl(media: Media | null | string | undefined) {
  if (!media || typeof media === 'string') return null

  const buildPublicMediaUrl = (filename: null | string | undefined) =>
    filename ? `/media/${filename}` : null

  return (
    buildPublicMediaUrl(media.sizes?.medium?.filename) ||
    buildPublicMediaUrl(media.sizes?.small?.filename) ||
    buildPublicMediaUrl(media.sizes?.thumbnail?.filename) ||
    buildPublicMediaUrl(media.filename) ||
    media.sizes?.medium?.url ||
    media.sizes?.small?.url ||
    media.sizes?.thumbnail?.url ||
    media.url ||
    null
  )
}

function getProfileValue(profile: null | Profile | string | undefined) {
  if (!profile || typeof profile === 'string') return null

  return profile
}

function getOwnerId(page: Page) {
  if (!page.owner) return null
  if (typeof page.owner === 'string') return page.owner
  return page.owner.id
}

function mapRelease(page: Page, profilesByOwnerId: Map<string, Profile>): ReleaseItem | null {
  const profile = getProfileValue(page.profile) || profilesByOwnerId.get(getOwnerId(page) || '')

  if (!profile || !page.slug) return null

  const pageImage = getMediaUrl(page.meta?.image as Media | null | string | undefined)
  const heroImage = getMediaUrl(page.hero?.media as Media | null | string | undefined)
  const coverImage = getMediaUrl(profile.coverImage as Media | null | string | undefined)
  const avatarImage = getMediaUrl(profile.avatar as Media | null | string | undefined)
  const contentDescription = removeRepeatedTitle(extractLayoutText(page), page.title)
  const heroDescription = removeRepeatedTitle(extractRichTextText(page.hero?.richText || null), page.title)
  const profileDescription = removeRepeatedTitle(profile.bio?.trim() || '', page.title)
  const description =
    contentDescription ||
    page.meta?.description?.trim() ||
    heroDescription ||
    profileDescription ||
    'No description available.'

  return {
    id: page.id,
    country: profile.location || '',
    creatorName: profile.displayName || page.title,
    description,
    imageUrl: pageImage || heroImage || coverImage || avatarImage || FALLBACK_RELEASE_IMAGE,
    releaseTitle: page.title,
    releaseSlug: page.slug,
  }
}

export default async function ReleasesHomeSection() {
  const payload = await getPayload({ config: configPromise })
  // This home feed intentionally loads only creator pages, never posts.
  const [pagesResult, profilesResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 2,
      limit: 100,
      overrideAccess: true,
      sort: '-publishedAt',
      where: {
        _status: {
          equals: 'published',
        },
      },
    }),
    payload.find({
      collection: 'profiles',
      depth: 1,
      limit: 100,
      overrideAccess: true,
      pagination: false,
    }),
  ])

  const profilesByOwnerId = new Map<string, Profile>()

  profilesResult.docs.forEach((profile) => {
    if (typeof profile.owner === 'object' && profile.owner?.id) {
      profilesByOwnerId.set(profile.owner.id, profile)
    }
  })

  const releases = pagesResult.docs
    .map((page) => mapRelease(page, profilesByOwnerId))
    .filter((release): release is ReleaseItem => Boolean(release))

  if (releases.length === 0) {
    return (
      <p className="py-8 text-sm text-slate-500 dark:text-gray-400">Aun no hay lanzamientos.</p>
    )
  }

  return <ReleasesHome releases={releases} />
}
