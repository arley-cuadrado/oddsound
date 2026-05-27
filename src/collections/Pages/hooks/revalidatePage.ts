import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Page } from '../../../payload-types'

function safelyRevalidate(args: {
  path: string
  payload: {
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
    }
  }
  sitemapTag: string
}) {
  const { path, payload, sitemapTag } = args

  try {
    revalidatePath(path)
    revalidateTag(sitemapTag, 'max')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown revalidation error'

    // Scheduled publish jobs run outside the normal App Router revalidation context.
    payload.logger.warn(`Skipping revalidation for "${path}": ${message}`)
  }
}

function revalidateHomeFeed(args: {
  payload: {
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
    }
  }
  sitemapTag: string
}) {
  const { payload, sitemapTag } = args

  payload.logger.info('Revalidating home releases feed at path: /')

  safelyRevalidate({
    path: '/',
    payload,
    sitemapTag,
  })
}

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = doc.slug === 'home' ? '/' : `/${doc.slug}`

      payload.logger.info(`Revalidating page at path: ${path}`)

      safelyRevalidate({
        path,
        payload,
        sitemapTag: 'pages-sitemap',
      })

      if (doc.slug !== 'home') {
        revalidateHomeFeed({
          payload,
          sitemapTag: 'pages-sitemap',
        })
      }
    }

    // If the page was previously published, we need to revalidate the old path
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const oldPath = previousDoc.slug === 'home' ? '/' : `/${previousDoc.slug}`

      payload.logger.info(`Revalidating old page at path: ${oldPath}`)

      safelyRevalidate({
        path: oldPath,
        payload,
        sitemapTag: 'pages-sitemap',
      })

      if (previousDoc.slug !== 'home') {
        revalidateHomeFeed({
          payload,
          sitemapTag: 'pages-sitemap',
        })
      }
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    const path = doc?.slug === 'home' ? '/' : `/${doc?.slug}`
    safelyRevalidate({
      path,
      payload,
      sitemapTag: 'pages-sitemap',
    })

    if (doc?.slug !== 'home') {
      revalidateHomeFeed({
        payload,
        sitemapTag: 'pages-sitemap',
      })
    }
  }

  return doc
}
