import type { Page, Profile } from '@/payload-types'
import { getReleaseCardImage } from '@/utilities/getReleaseCardImage'

import type { ReleaseItem } from './types'

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

export function getProfileValue(profile: null | Profile | string | undefined) {
  if (!profile || typeof profile === 'string') return null

  return profile
}

export function getOwnerId(page: Page) {
  if (!page.owner) return null
  if (typeof page.owner === 'string') return page.owner
  return page.owner.id
}

export function getOwnerName(page: Page) {
  if (!page.owner || typeof page.owner === 'string') return null
  return page.owner.name || null
}

export function isAdminOwnedRelease(page: Page) {
  if (!page.owner || typeof page.owner === 'string') return false

  return page.owner.role === 'admin'
}

function getSpotifyURL(page: Page) {
  if (!Array.isArray(page.layout)) return null

  const spotifyBlock = page.layout.find(
    (block): block is Extract<Page['layout'][number], { blockType: 'spotifyBlock' }> =>
      Boolean(block && typeof block === 'object' && block.blockType === 'spotifyBlock'),
  )

  if (!spotifyBlock || typeof spotifyBlock.spotify !== 'string') return null

  return spotifyBlock.spotify.trim() || null
}

export function buildProfilesByOwnerId(profiles: Profile[]) {
  const profilesByOwnerId = new Map<string, Profile>()

  profiles.forEach((profile) => {
    if (!profile.owner) return

    const ownerId = typeof profile.owner === 'string' ? profile.owner : profile.owner.id

    if (ownerId) {
      profilesByOwnerId.set(ownerId, profile)
    }
  })

  return profilesByOwnerId
}

export function mapRelease(page: Page, profilesByOwnerId: Map<string, Profile>): ReleaseItem | null {
  const profile = getProfileValue(page.profile) || profilesByOwnerId.get(getOwnerId(page) || '')
  const ownerName = getOwnerName(page)
  const isAdminRelease = isAdminOwnedRelease(page)

  if (!page.slug) return null
  if (!profile && !isAdminRelease) return null

  const contentDescription = removeRepeatedTitle(extractLayoutText(page), page.title)
  const heroDescription = removeRepeatedTitle(extractRichTextText(page.hero?.richText || null), page.title)
  const profileDescription = removeRepeatedTitle(profile?.bio?.trim() || '', page.title)
  const description =
    contentDescription ||
    page.meta?.description?.trim() ||
    heroDescription ||
    profileDescription ||
    'No description available.'

  return {
    id: page.id,
    country: isAdminRelease ? '' : profile?.location || '',
    creatorName: isAdminRelease ? 'oddsound' : profile?.displayName || ownerName || page.title,
    description,
    genre: profile?.genre || '',
    imageUrl: getReleaseCardImage({ page, profile }),
    publishedAt: page.publishedAt || null,
    releaseSlug: page.slug,
    releaseTitle: page.title,
    spotifyURL: getSpotifyURL(page),
  }
}
