import configPromise from '@payload-config'
import type { Profile } from '@/payload-types'
import { getPayload } from 'payload'

import ReleasesHome from './ReleasesHome'
import { buildProfilesByOwnerId, mapRelease } from './releaseData'
import type { ReleaseItem } from './types'

export default async function ReleasesHomeSection() {
  const payload = await getPayload({ config: configPromise })
  // This home feed intentionally loads only creator pages, never posts.
  const [pagesResult, profilesResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 2,
      limit: 100,
      overrideAccess: true,
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
      limit: 100,
      overrideAccess: true,
      pagination: false,
    }),
  ])

  const profilesByOwnerId = buildProfilesByOwnerId(profilesResult.docs as Profile[])

  const releases = pagesResult.docs
    .map((page) => mapRelease(page, profilesByOwnerId))
    .filter((release): release is ReleaseItem => Boolean(release))

  if (releases.length === 0) {
    return (
      <p className="py-8 text-sm text-[#777] dark:text-gray-400">Aun no hay lanzamientos.</p>
    )
  }

  return <ReleasesHome releases={releases} />
}
