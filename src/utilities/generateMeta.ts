import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { extractLexicalPlainText } from './extractLexicalPlainText'
import { extractReleaseShareContent } from './extractReleaseShareContent'
import { extractTextContent } from './sharePost'
import { getReleaseCardImage } from './getReleaseCardImage'
import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { getMediaResourceURL } from './getMediaUrl'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/oddsound_main_share_image.jpg'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

const FALLBACK_DESCRIPTION = 'Oddsound - Be heard. Stay odd.'

function toAbsoluteURL(url: null | string | undefined) {
  if (!url) return null

  if (url.startsWith('http://') || url.startsWith('https://')) return url

  return `${getServerSideURL()}${url.startsWith('/') ? url : `/${url}`}`
}

function isPostDoc(doc: Partial<Page> | Partial<Post>): doc is Partial<Post> {
  return 'content' in doc
}

function isPageDoc(doc: Partial<Page> | Partial<Post>): doc is Partial<Page> {
  return 'hero' in doc
}

function getFallbackImageURL(doc: Partial<Page> | Partial<Post> | null) {
  if (!doc) return null

  if (isPostDoc(doc)) {
    const heroImage =
      doc.heroImage && typeof doc.heroImage === 'object' ? getMediaResourceURL(doc.heroImage) : null

    return toAbsoluteURL(heroImage)
  }

  if (isPageDoc(doc) && doc.hero) {
    const releaseImage = getReleaseCardImage({
      page: doc as Page,
    })

    return toAbsoluteURL(releaseImage)
  }

  return null
}

function getFallbackDescription(doc: Partial<Page> | Partial<Post> | null) {
  if (!doc) return FALLBACK_DESCRIPTION

  if (doc.meta?.description?.trim()) {
    return doc.meta.description.trim()
  }

  if (isPostDoc(doc)) {
    const content = extractLexicalPlainText(doc.content)
    const description = extractTextContent(content, 3).replace(/\s+/g, ' ').trim()

    return description || FALLBACK_DESCRIPTION
  }

  if (isPageDoc(doc)) {
    const content = extractReleaseShareContent({
      hero: doc.hero,
      layout: Array.isArray(doc.layout) ? doc.layout : [],
    })
    const description = extractTextContent(content, 3).replace(/\s+/g, ' ').trim()

    return description || FALLBACK_DESCRIPTION
  }

  return FALLBACK_DESCRIPTION
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  urlPath?: string
}): Promise<Metadata> => {
  const { doc, urlPath } = args

  const ogImage = doc?.meta?.image ? getImageURL(doc.meta.image) : getFallbackImageURL(doc)
  const description = getFallbackDescription(doc)

  const baseTitle = doc?.meta?.title?.trim() || doc?.title?.trim()
  const title = baseTitle
    ? `${baseTitle} | Oddsound`
    : 'Oddsound - Be heard. Stay odd.'

  return {
    description,
    openGraph: mergeOpenGraph({
      description,
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: urlPath || (typeof doc?.slug === 'string' ? doc.slug : '/'),
    }),
    title,
    twitter: {
      card: 'summary_large_image',
      description,
      images: ogImage ? [ogImage] : undefined,
      title,
    },
  }
}
