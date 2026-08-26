import type { Biography } from '@/payload-types'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

import { revalidatePath } from 'next/cache'

type BiographyRevalidationPayload = Pick<Payload, 'findByID' | 'logger'>

async function resolveProfileSlug(args: {
  payload: BiographyRevalidationPayload
  profile: Biography['profile']
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
    payload.logger.warn(`Skipping biography revalidation: ${message}`)
    return null
  }
}

function safelyRevalidate(args: {
  path: string
  payload: Pick<BiographyRevalidationPayload, 'logger'>
}) {
  const { path, payload } = args

  try {
    revalidatePath(path)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown revalidation error'
    payload.logger.warn(`Skipping revalidation for "${path}": ${message}`)
  }
}

async function revalidateBiographySurface(args: {
  biography?: null | Pick<Biography, 'profile'>
  payload: BiographyRevalidationPayload
}) {
  const { biography, payload } = args

  if (!biography?.profile) return

  const profileSlug = await resolveProfileSlug({
    payload,
    profile: biography.profile,
  })

  if (!profileSlug) return

  const bioPath = `/${profileSlug}/bio`

  payload.logger.info(`Revalidating biography at path: ${bioPath}`)
  safelyRevalidate({
    path: bioPath,
    payload,
  })
}

export const revalidateBiography: CollectionAfterChangeHook<Biography> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  await revalidateBiographySurface({
    biography: previousDoc,
    payload,
  })

  await revalidateBiographySurface({
    biography: doc,
    payload,
  })

  return doc
}

export const revalidateBiographyDelete: CollectionAfterDeleteHook<Biography> = async ({
  doc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  await revalidateBiographySurface({
    biography: doc,
    payload,
  })

  return doc
}
