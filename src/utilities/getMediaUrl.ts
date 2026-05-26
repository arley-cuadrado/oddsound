import type { Media } from '@/payload-types'

import { getServerSideURL } from './getURL'

/**
 * Processes media resource URL to ensure proper formatting
 * @param url The original URL from the resource
 * @param cacheTag Optional cache tag to append to the URL
 * @returns Properly formatted URL with cache tag if provided
 *
 * Local paths (e.g. `/api/media/file/image.webp`) are kept relative so
 * Next.js image optimization treats them as local rather than fetching
 * through `remotePatterns`, which blocks private IPs since Next.js 16.
 */
export const getMediaUrl = (url: string | null | undefined, cacheTag?: string | null): string => {
  if (!url) return ''

  let normalizedURL = url

  try {
    const parsedURL = new URL(url)
    const serverURL = getServerSideURL()

    if (serverURL) {
      const parsedServerURL = new URL(serverURL)

      // Normalize same-origin media URLs to local paths so Next treats them as local assets.
      if (parsedURL.origin === parsedServerURL.origin) {
        normalizedURL = `${parsedURL.pathname}${parsedURL.search}`
      }
    }
  } catch {
    normalizedURL = url
  }

  if (cacheTag && cacheTag !== '') {
    cacheTag = encodeURIComponent(cacheTag)
  }

  return cacheTag ? `${normalizedURL}${normalizedURL.includes('?') ? '&' : '?'}${cacheTag}` : normalizedURL
}

export function getMediaResourceURL(media: Media | null | string | undefined, cacheTag?: string | null) {
  if (!media || typeof media === 'string') return null

  const preferredURL =
    media.sizes?.medium?.url ||
    media.sizes?.small?.url ||
    media.sizes?.thumbnail?.url ||
    media.url ||
    (media.sizes?.medium?.filename ? `/media/${media.sizes.medium.filename}` : null) ||
    (media.sizes?.small?.filename ? `/media/${media.sizes.small.filename}` : null) ||
    (media.sizes?.thumbnail?.filename ? `/media/${media.sizes.thumbnail.filename}` : null) ||
    (media.filename ? `/media/${media.filename}` : null)

  return preferredURL ? getMediaUrl(preferredURL, cacheTag) : null
}
