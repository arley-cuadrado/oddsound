import type { Biography } from '@/payload-types'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

import { revalidatePath } from 'next/cache'

type BiographyRevalidationPayload = Pick<Payload, 'find' | 'findByID' | 'logger'>

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
  const releasesPath = `/${profileSlug}/releases`
  const profileID =
    typeof biography.profile === 'string' || typeof biography.profile === 'number'
      ? biography.profile
      : biography.profile && typeof biography.profile === 'object' && 'id' in biography.profile
        ? biography.profile.id
        : null

  payload.logger.info(`Revalidating biography at path: ${bioPath}`)
  safelyRevalidate({
    path: bioPath,
    payload,
  })
  safelyRevalidate({
    path: releasesPath,
    payload,
  })

  if (!profileID) return

  try {
    const releases = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1000,
      overrideAccess: true,
      pagination: false,
      select: { slug: true },
      where: {
        and: [{ profile: { equals: profileID } }, { _status: { equals: 'published' } }],
      },
    })

    for (const release of releases.docs) {
      if (!release.slug) continue
      safelyRevalidate({
        path: `/${profileSlug}/release/${release.slug}`,
        payload,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown release lookup error'
    payload.logger.warn(`Skipping release revalidation: ${message}`)
  }
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
