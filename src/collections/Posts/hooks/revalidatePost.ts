import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post } from '../../../payload-types'

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

    payload.logger.warn(`Skipping revalidation for "${path}": ${message}`)
  }
}

function revalidateHomeHero(args: {
  payload: {
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
    }
  }
  sitemapTag: string
}) {
  const { payload, sitemapTag } = args

  payload.logger.info('Revalidating home featured posts at path: /')

  safelyRevalidate({
    path: '/',
    payload,
    sitemapTag,
  })
}

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = `/posts/${doc.slug}`

      payload.logger.info(`Revalidating post at path: ${path}`)

      safelyRevalidate({
        path,
        payload,
        sitemapTag: 'posts-sitemap',
      })

      revalidateHomeHero({
        payload,
        sitemapTag: 'posts-sitemap',
      })
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/posts/${previousDoc.slug}`

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      safelyRevalidate({
        path: oldPath,
        payload,
        sitemapTag: 'posts-sitemap',
      })

      revalidateHomeHero({
        payload,
        sitemapTag: 'posts-sitemap',
      })
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    const path = `/posts/${doc?.slug}`

    safelyRevalidate({
      path,
      payload,
      sitemapTag: 'posts-sitemap',
    })

    revalidateHomeHero({
      payload,
      sitemapTag: 'posts-sitemap',
    })
  }

  return doc
}
