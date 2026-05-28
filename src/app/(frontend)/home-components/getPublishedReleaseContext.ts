import type { Page, Profile } from '@/payload-types'
import type { Payload } from 'payload'

import { buildProfilesByOwnerId } from './releaseData'

type PublishedReleaseContext = {
  pages: Page[]
  profilesByOwnerId: Map<string, Profile>
}

const RELEASE_PAGE_SELECT = {
  hero: true,
  layout: true,
  meta: true,
  owner: true,
  profile: true,
  publishedAt: true,
  slug: true,
  title: true,
} as const

const PROFILE_SELECT = {
  avatar: true,
  bio: true,
  coverImage: true,
  displayName: true,
  genre: true,
  location: true,
  owner: true,
  slug: true,
} as const

export async function getPublishedReleaseContext(
  payload: Payload,
  options?: {
    limit?: number
  },
): Promise<PublishedReleaseContext> {
  const limit = options?.limit ?? 100

  const [pagesResult, profilesResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 1,
      limit,
      overrideAccess: true,
      pagination: false,
      select: RELEASE_PAGE_SELECT,
      sort: '-publishedAt',
      where: {
        _status: {
          equals: 'published',
        },
      },
    }),
    payload.find({
      collection: 'profiles',
      depth: 1,
      limit,
      overrideAccess: true,
      pagination: false,
      select: PROFILE_SELECT,
    }),
  ])

  return {
    pages: pagesResult.docs as Page[],
    profilesByOwnerId: buildProfilesByOwnerId(profilesResult.docs as Profile[]),
  }
}
