import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Product } from '@/payload-types'

async function resolveProfileSlug(args: {
  payload: {
    findByID: (...args: any[]) => Promise<any>
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
    }
  }
  profile: Product['profile']
}) {
  const { payload, profile } = args

  if (profile && typeof profile === 'object' && profile.slug) return profile.slug

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
    payload.logger.warn(`Skipping product storefront revalidation: ${message}`)
    return null
  }
}

async function revalidateShopPath(args: {
  payload: {
    findByID: (...args: any[]) => Promise<any>
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
    }
  }
  profile: Product['profile']
}) {
  const { payload, profile } = args
  const profileSlug = await resolveProfileSlug({ payload, profile })

  if (!profileSlug) return

  try {
    const path = `/${profileSlug}/shop`
    payload.logger.info(`Revalidating shop at path: ${path}`)
    revalidatePath(path)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown revalidation error'
    payload.logger.warn(`Skipping shop revalidation: ${message}`)
  }
}

export const revalidateProduct: CollectionAfterChangeHook<Product> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  if (doc.status === 'active') {
    await revalidateShopPath({
      payload,
      profile: doc.profile,
    })
  }

  if (previousDoc?.status === 'active' && doc.status !== 'active') {
    await revalidateShopPath({
      payload,
      profile: previousDoc.profile,
    })
  }

  return doc
}

export const revalidateProductDelete: CollectionAfterDeleteHook<Product> = async ({
  doc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  await revalidateShopPath({
    payload,
    profile: doc?.profile,
  })

  return doc
}
