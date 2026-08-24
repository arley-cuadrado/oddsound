import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Page } from '../../../payload-types'

async function resolveProfileSlug(args: {
  payload: {
    findByID: (...args: any[]) => Promise<any>
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
    }
  }
  profile: Page['profile']
}) {
  const { payload, profile } = args

  if (profile && typeof profile === 'object' && 'slug' in profile && profile.slug) {
    return profile.slug
  }

  const profileID =
    typeof profile === 'string' || typeof profile === 'number'
      ? profile
      : profile && typeof profile === 'object' && 'id' in profile
        ? profile.id
        : null

  if (!profileID) return null

  try {
    const resolvedProfile = await payload.findByID({
      collection: 'profiles',
      depth: 0,
      id: profileID,
      overrideAccess: true,
      select: {
        slug: true,
      },
    })

    return resolvedProfile?.slug || null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown profile lookup error'
    payload.logger.warn(`Skipping profile-aware release revalidation: ${message}`)
    return null
  }
}

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

async function revalidateProfileReleaseSurfaces(args: {
  payload: {
    findByID: (...args: any[]) => Promise<any>
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
    }
  }
  page: Pick<Page, 'profile' | 'slug'>
  sitemapTag: string
}) {
  const { payload, page, sitemapTag } = args
  const profileSlug = await resolveProfileSlug({
    payload,
    profile: page.profile,
  })

  if (!profileSlug || !page.slug) return

  const bioPath = `/${profileSlug}/bio`
  const releasesPath = `/${profileSlug}/releases`
  const releaseDetailPath = `/${profileSlug}/release/${page.slug}`

  payload.logger.info(`Revalidating biography at path: ${bioPath}`)
  safelyRevalidate({
    path: bioPath,
    payload,
    sitemapTag,
  })

  payload.logger.info(`Revalidating releases listing at path: ${releasesPath}`)
  safelyRevalidate({
    path: releasesPath,
    payload,
    sitemapTag,
  })

  payload.logger.info(`Revalidating release detail at path: ${releaseDetailPath}`)
  safelyRevalidate({
    path: releaseDetailPath,
    payload,
    sitemapTag,
  })
}

export const revalidatePage: CollectionAfterChangeHook<Page> = async ({
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

        await revalidateProfileReleaseSurfaces({
          payload,
          page: doc,
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

        await revalidateProfileReleaseSurfaces({
          payload,
          page: previousDoc,
          sitemapTag: 'pages-sitemap',
        })
      }
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = async ({
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

      await revalidateProfileReleaseSurfaces({
        payload,
        page: doc,
        sitemapTag: 'pages-sitemap',
      })
    }
  }

  return doc
}
