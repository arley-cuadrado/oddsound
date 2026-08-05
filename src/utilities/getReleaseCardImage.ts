import type { Media, Page, Profile } from '@/payload-types'

import { getMediaResourceURL } from './getMediaUrl'
import { getServerSideURL } from './getURL'

const FALLBACK_RELEASE_IMAGE = '/home-images/hero.jpeg'
const LEGACY_MEDIA_API_SEGMENT = '/api/media/file/'

function isBrokenLocalLegacyMediaURL(url: null | string | undefined) {
  if (!url) return false

  const isLocalEnvironment = getServerSideURL().includes('localhost')
  const hasBlobStorage = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  return isLocalEnvironment && !hasBlobStorage && url.startsWith(LEGACY_MEDIA_API_SEGMENT)
}

function getMediaURL(media: Media | null | string | undefined) {
  const url = getMediaResourceURL(media, media && typeof media === 'object' ? media.updatedAt : null)

  return isBrokenLocalLegacyMediaURL(url) ? null : url
}

type ReleaseCardImageArgs = {
  page: Page
  profile?: null | Profile
}

/**
 * Centralizes the release-card image policy used across home, search, and
 * any future release listing surfaces. This keeps dashboard/frontend behavior
 * stable even if the storage layer changes internally.
 */
export function getReleaseCardImage({ page, profile }: ReleaseCardImageArgs) {
  const pageImage = getMediaURL(page.meta?.image as Media | null | string | undefined)
  const albumImage = getMediaURL(page.hero?.albumImage as Media | null | string | undefined)
  const heroImage = getMediaURL(page.hero?.media as Media | null | string | undefined)
  const coverImage = getMediaURL(profile?.coverImage as Media | null | string | undefined)
  const avatarImage = getMediaURL(profile?.avatar as Media | null | string | undefined)

  switch (page.hero?.type) {
    case 'lowImpact':
      return albumImage || pageImage || coverImage || avatarImage || FALLBACK_RELEASE_IMAGE
    case 'mediumImpact':
    case 'highImpact':
      return heroImage || pageImage || coverImage || avatarImage || albumImage || FALLBACK_RELEASE_IMAGE
    default:
      return pageImage || heroImage || albumImage || coverImage || avatarImage || FALLBACK_RELEASE_IMAGE
  }
}
