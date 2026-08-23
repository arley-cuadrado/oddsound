import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import type { Media, Page, Post, Profile } from '@/payload-types'
import { getMediaResourceURL } from '@/utilities/getMediaUrl'
import { getReleaseCardImage } from '@/utilities/getReleaseCardImage'
import { normalizeSearchValue } from '@/utilities/normalizeSearchValue'
import { getPublishedReleaseContext } from '../../home-components/getPublishedReleaseContext'
import {
  getOwnerId,
  getOwnerName,
  getProfileValue,
  isAdminOwnedRelease,
} from '../../home-components/releaseData'
import type { ArtistTile, DiscoveryFacet, DiscoveryPool, ReleaseTile, SceneTile } from './types'

/**
 * The whole pool is serialized into the page payload, so these caps bound both
 * the Mongo reads and the HTML size. Raising them past a few hundred items is
 * the signal to move pagination behind a route handler.
 */
const RELEASE_LIMIT = 240
const ARTIST_LIMIT = 60
const SCENE_LIMIT = 40
const FACET_LIMIT = 12
const POOL_REVALIDATE_SECONDS = 300

type MappedRelease = {
  profileId: null | string
  tile: ReleaseTile
}

function mapReleaseTile(page: Page, profilesByOwnerId: Map<string, Profile>): MappedRelease | null {
  // Same ownership rules as the home feed: prefer the page relation, fall back
  // to the owner, and let admin-authored releases show up as oddsound.
  const profile = getProfileValue(page.profile) || profilesByOwnerId.get(getOwnerId(page) || '')
  const isAdminRelease = isAdminOwnedRelease(page)

  if (!page.slug) return null
  if (!profile && !isAdminRelease) return null

  return {
    profileId: profile?.id ? String(profile.id) : null,
    tile: {
      country: isAdminRelease ? '' : profile?.location?.trim() || '',
      creatorName: isAdminRelease
        ? 'oddsound'
        : profile?.displayName || getOwnerName(page) || page.title,
      creatorSlug: isAdminRelease ? null : profile?.slug || null,
      genre: isAdminRelease ? '' : profile?.genre?.trim() || '',
      id: String(page.id),
      imageUrl: getReleaseCardImage({ page, profile }),
      publishedAt: page.publishedAt || null,
      slug: page.slug,
      title: page.title,
      type: 'release',
    },
  }
}

function buildFacet(values: string[]): DiscoveryFacet[] {
  const counts = new Map<string, { count: number; value: string }>()

  values.forEach((rawValue) => {
    const value = rawValue.trim()
    const key = normalizeSearchValue(value)

    if (!key) return

    const existing = counts.get(key)

    if (existing) {
      existing.count += 1
      return
    }

    counts.set(key, { count: 1, value })
  })

  return Array.from(counts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count

      return a.value.localeCompare(b.value, 'es')
    })
    .slice(0, FACET_LIMIT)
}

function buildArtistTiles({
  profilesByOwnerId,
  releases,
}: {
  profilesByOwnerId: Map<string, Profile>
  releases: MappedRelease[]
}): ArtistTile[] {
  const profilesById = new Map<string, Profile>()

  profilesByOwnerId.forEach((profile) => {
    if (profile.id) {
      profilesById.set(String(profile.id), profile)
    }
  })

  const stats = new Map<
    string,
    { latestImage: null | string; latestPublishedAt: null | string; count: number }
  >()

  releases.forEach(({ profileId, tile }) => {
    if (!profileId) return

    const existing = stats.get(profileId)

    if (!existing) {
      // Releases arrive sorted by recency, so the first one seen is the latest.
      stats.set(profileId, {
        count: 1,
        latestImage: tile.imageUrl,
        latestPublishedAt: tile.publishedAt,
      })
      return
    }

    existing.count += 1
  })

  const tiles: ArtistTile[] = []

  stats.forEach((stat, profileId) => {
    const profile = profilesById.get(profileId)

    if (!profile?.slug || !profile.displayName) return

    const avatarURL = getMediaResourceURL(
      profile.avatar as Media | null | string | undefined,
      typeof profile.avatar === 'object' ? profile.avatar?.updatedAt : null,
    )
    const coverURL = getMediaResourceURL(
      profile.coverImage as Media | null | string | undefined,
      typeof profile.coverImage === 'object' ? profile.coverImage?.updatedAt : null,
    )

    tiles.push({
      country: profile.location?.trim() || '',
      displayName: profile.displayName,
      genre: profile.genre?.trim() || '',
      id: String(profile.id),
      // Falls back to the artist's latest release art so the tile is never blank.
      imageUrl: avatarURL || coverURL || stat.latestImage,
      publishedAt: stat.latestPublishedAt,
      releaseCount: stat.count,
      slug: profile.slug,
      type: 'artist',
    })
  })

  return tiles
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, ARTIST_LIMIT)
}

function mapSceneTile(post: Post): null | SceneTile {
  if (!post.slug) return null

  const heroURL = getMediaResourceURL(
    post.heroImage as Media | null | string | undefined,
    typeof post.heroImage === 'object' ? post.heroImage?.updatedAt : null,
  )
  const metaURL = getMediaResourceURL(
    post.meta?.image as Media | null | string | undefined,
    typeof post.meta?.image === 'object' ? post.meta?.image?.updatedAt : null,
  )

  return {
    id: String(post.id),
    imageUrl: heroURL || metaURL,
    publishedAt: post.publishedAt || null,
    slug: post.slug,
    title: post.title,
    type: 'scene',
  }
}

async function buildDiscoveryPool(): Promise<DiscoveryPool> {
  const payload = await getPayload({ config: configPromise })

  const [{ pages, profilesByOwnerId }, postsResult] = await Promise.all([
    getPublishedReleaseContext(payload, { limit: RELEASE_LIMIT }),
    payload.find({
      collection: 'posts',
      depth: 1,
      limit: SCENE_LIMIT,
      overrideAccess: true,
      pagination: false,
      select: {
        heroImage: true,
        meta: true,
        publishedAt: true,
        slug: true,
        title: true,
      },
      sort: '-publishedAt',
      where: {
        _status: {
          equals: 'published',
        },
      },
    }),
  ])

  const releases = pages
    .map((page) => mapReleaseTile(page, profilesByOwnerId))
    .filter((entry): entry is MappedRelease => Boolean(entry))

  const scenes = (postsResult.docs as Post[])
    .map(mapSceneTile)
    .filter((tile): tile is SceneTile => Boolean(tile))

  return {
    artists: buildArtistTiles({ profilesByOwnerId, releases }),
    facets: {
      countries: buildFacet(releases.map(({ tile }) => tile.country)),
      genres: buildFacet(releases.map(({ tile }) => tile.genre)),
    },
    releases: releases.map(({ tile }) => tile),
    scenes,
  }
}

/**
 * Cached because every visit to Discovery would otherwise re-read the whole
 * published catalog. Time-based rather than tag-based: the release hooks
 * revalidate `/` and the profile routes, but not this surface.
 */
export const getDiscoveryPool = unstable_cache(buildDiscoveryPool, ['discovery-pool'], {
  revalidate: POOL_REVALIDATE_SECONDS,
  tags: ['discovery-pool'],
})
