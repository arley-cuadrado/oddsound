import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'
import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'

export type PreviewSearchParams = {
  collection?: string | null
  id?: string | null
  path?: string | null
  profile?: string | null
  previewSecret: string
  slug?: string | null
}

async function resolvePagePreviewPath(args: {
  payload: Awaited<ReturnType<typeof getPayload>>
  documentID: null | string
  profileRef: null | string
  slug: string
}) {
  const { documentID, payload, profileRef, slug } = args

  const resolveProfileSlugFromID = async (profileID: null | string) => {
    if (!profileID) return null

    try {
      const profile = await payload.findByID({
        collection: 'profiles',
        id: profileID,
        depth: 0,
        overrideAccess: true,
      })

      return typeof profile?.slug === 'string' && profile.slug.trim() ? profile.slug : null
    } catch {
      return null
    }
  }

  const resolveProfileSlugFromOwner = async (owner: unknown) => {
    const ownerID =
      typeof owner === 'string' || typeof owner === 'number'
        ? String(owner)
        : owner && typeof owner === 'object' && 'id' in owner
          ? String(owner.id)
          : null

    if (!ownerID) return null

    const profileID = await findCreatorProfileByOwner({
      ownerID,
      payload,
    })

    return resolveProfileSlugFromID(profileID)
  }

  if (documentID) {
    try {
      const page = await payload.findByID({
        collection: 'pages',
        id: documentID,
        depth: 1,
        draft: true,
        overrideAccess: true,
      })

      const pageSlug = typeof page?.slug === 'string' && page.slug.trim() ? page.slug : slug
      const pageProfileSlug =
        page?.profile && typeof page.profile === 'object' && typeof page.profile.slug === 'string'
          ? page.profile.slug
          : await resolveProfileSlugFromID(
              typeof page?.profile === 'string' || typeof page?.profile === 'number'
                ? String(page.profile)
                : null,
            )
      const ownerProfileSlug = pageProfileSlug ? null : await resolveProfileSlugFromOwner(page?.owner)
      const resolvedProfileSlug = pageProfileSlug || ownerProfileSlug

      if (resolvedProfileSlug && pageSlug) {
        return `/${resolvedProfileSlug}/release/${encodeURIComponent(pageSlug)}`
      }
    } catch {
      // Fall through to direct profile resolution below.
    }
  }

  if (!profileRef || !slug) return null

  const directProfileSlug = await resolveProfileSlugFromID(profileRef)

  if (directProfileSlug) {
    return `/${directProfileSlug}/release/${encodeURIComponent(slug)}`
  }

  const profile = await findPublicProfileBySlug({
    payload,
    slug: profileRef,
  })

  if (typeof profile?.slug === 'string' && profile.slug.trim()) {
    return `/${profile.slug}/release/${encodeURIComponent(slug)}`
  }

  return null
}

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { searchParams } = new URL(req.url)

  const collection = searchParams.get('collection')
  const documentID = searchParams.get('id')
  const path = searchParams.get('path')
  const profileRef = searchParams.get('profile')
  const previewSecret = searchParams.get('previewSecret')
  const slug = searchParams.get('slug')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  let user

  try {
    user = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
  } catch (error) {
    payload.logger.error({ err: error }, 'Error verifying token for live preview')
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const draft = await draftMode()

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  // You can add additional checks here to see if the user is allowed to preview this page

  draft.enable()

  const resolvedPath =
    path ||
    (collection === 'pages' && slug
      ? await resolvePagePreviewPath({
          documentID,
          payload,
          profileRef,
          slug,
        })
      : null)

  if (!resolvedPath) {
    return new Response('Insufficient search params', { status: 404 })
  }

  if (!resolvedPath.startsWith('/')) {
    return new Response('This endpoint can only be used for relative previews', { status: 500 })
  }

  redirect(resolvedPath)
}
