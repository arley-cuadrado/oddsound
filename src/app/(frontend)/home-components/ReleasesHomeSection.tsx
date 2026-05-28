import configPromise from '@payload-config'
import { getPayload } from 'payload'

import ReleasesHome from './ReleasesHome'
import { getPublishedReleaseContext } from './getPublishedReleaseContext'
import { mapRelease } from './releaseData'
import type { ReleaseItem } from './types'

export default async function ReleasesHomeSection() {
  const payload = await getPayload({ config: configPromise })
  // This home feed intentionally loads only creator pages, never posts.
  const { pages, profilesByOwnerId } = await getPublishedReleaseContext(payload, { limit: 100 })

  const releases = pages
    .map((page) => mapRelease(page, profilesByOwnerId))
    .filter((release): release is ReleaseItem => Boolean(release))

  if (releases.length === 0) {
    return (
      <p className="py-8 text-sm text-[#777] dark:text-[#858c98]">Aun no hay lanzamientos.</p>
    )
  }

  return <ReleasesHome releases={releases} />
}
