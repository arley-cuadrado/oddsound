import { describe, expect, it } from 'vitest'

import {
  assignHeroTiles,
  buildDiscoveryFeed,
  diversify,
  interleave,
  matchScore,
} from '@/app/(frontend)/search/discovery/rank'
import type {
  ArtistTile,
  DiscoveryPool,
  ReleaseTile,
  SceneTile,
} from '@/app/(frontend)/search/discovery/types'

function buildRelease(overrides: Partial<ReleaseTile> & { id: string }): ReleaseTile {
  return {
    country: 'Colombia',
    creatorName: 'Artista',
    creatorSlug: 'artista',
    genre: 'Rock',
    imageUrl: null,
    publishedAt: '2026-01-01T00:00:00.000Z',
    slug: `release-${overrides.id}`,
    title: `Release ${overrides.id}`,
    type: 'release',
    ...overrides,
  }
}

function buildArtist(overrides: Partial<ArtistTile> & { id: string }): ArtistTile {
  return {
    country: 'Colombia',
    displayName: `Artista ${overrides.id}`,
    genre: 'Rock',
    imageUrl: null,
    publishedAt: '2026-01-01T00:00:00.000Z',
    releaseCount: 1,
    slug: `artista-${overrides.id}`,
    type: 'artist',
    ...overrides,
  }
}

function buildScene(overrides: Partial<SceneTile> & { id: string }): SceneTile {
  return {
    imageUrl: null,
    publishedAt: '2026-01-01T00:00:00.000Z',
    slug: `escena-${overrides.id}`,
    title: `Escena ${overrides.id}`,
    type: 'scene',
    ...overrides,
  }
}

describe('diversify', () => {
  it('never places two releases from the same artist back to back', () => {
    const releases = [
      buildRelease({ creatorSlug: 'a', id: '1' }),
      buildRelease({ creatorSlug: 'a', id: '2' }),
      buildRelease({ creatorSlug: 'b', id: '3' }),
      buildRelease({ creatorSlug: 'a', id: '4' }),
      buildRelease({ creatorSlug: 'c', id: '5' }),
    ]

    const ordered = diversify(releases)

    ordered.forEach((tile, index) => {
      if (index === 0) return

      expect(tile.creatorSlug).not.toBe(ordered[index - 1]?.creatorSlug)
    })
  })

  it('keeps every release even when the rule cannot be satisfied', () => {
    const releases = [
      buildRelease({ creatorSlug: 'a', id: '1' }),
      buildRelease({ creatorSlug: 'a', id: '2' }),
      buildRelease({ creatorSlug: 'a', id: '3' }),
    ]

    const ordered = diversify(releases)

    expect(ordered).toHaveLength(3)
    expect(ordered.map((tile) => tile.id).sort()).toEqual(['1', '2', '3'])
  })

  it('limits how often the same genre repeats inside the lookback window', () => {
    const releases = [
      buildRelease({ creatorSlug: 'a', genre: 'Rock', id: '1' }),
      buildRelease({ creatorSlug: 'b', genre: 'Rock', id: '2' }),
      buildRelease({ creatorSlug: 'c', genre: 'Rock', id: '3' }),
      buildRelease({ creatorSlug: 'd', genre: 'Jazz', id: '4' }),
    ]

    const ordered = diversify(releases)

    expect(ordered.slice(0, 3).map((tile) => tile.genre)).toEqual(['Rock', 'Rock', 'Jazz'])
  })
})

describe('interleave', () => {
  it('injects a guest tile after every block of releases, alternating source', () => {
    const releases = Array.from({ length: 12 }, (_, index) =>
      buildRelease({ id: String(index + 1) }),
    )
    const tiles = interleave({
      artists: [buildArtist({ id: 'a' })],
      releases,
      scenes: [buildScene({ id: 's' })],
    })

    expect(tiles[6]?.type).toBe('artist')
    expect(tiles[13]?.type).toBe('scene')
    expect(tiles).toHaveLength(14)
  })

  it('appends leftover guests when there are not enough releases', () => {
    const tiles = interleave({
      artists: [buildArtist({ id: 'a' }), buildArtist({ id: 'b' })],
      releases: [buildRelease({ id: '1' })],
      scenes: [buildScene({ id: 's' })],
    })

    expect(tiles.map((tile) => tile.type)).toEqual(['release', 'artist', 'scene', 'artist'])
  })

  it('skips the guest slot when both guest sources are exhausted', () => {
    const releases = Array.from({ length: 8 }, (_, index) =>
      buildRelease({ id: String(index + 1) }),
    )
    const tiles = interleave({ artists: [], releases, scenes: [] })

    expect(tiles).toHaveLength(8)
    expect(tiles.every((tile) => tile.type === 'release')).toBe(true)
  })
})

describe('assignHeroTiles', () => {
  it('marks the first tile of every block as a hero and alternates its side', () => {
    const tiles = Array.from({ length: 13 }, (_, index) => buildRelease({ id: String(index + 1) }))
    const positioned = assignHeroTiles(tiles)

    expect(positioned.filter((entry) => entry.isHero).map((entry) => entry.tile.id)).toEqual([
      '1',
      '7',
      '13',
    ])
    expect(positioned[0]?.heroColumnStart).toBe(1)
    expect(positioned[6]?.heroColumnStart).toBe(2)
    expect(positioned[12]?.heroColumnStart).toBe(1)
  })
})

describe('matchScore', () => {
  it('ranks exact matches above prefixes and prefixes above substrings', () => {
    // Genre and country are blanked so only the title can produce a match.
    const neutral = { country: '', creatorName: '', genre: '' }
    const exact = matchScore(buildRelease({ ...neutral, id: '1', title: 'Rock' }), 'rock')
    const prefix = matchScore(buildRelease({ ...neutral, id: '2', title: 'Rockola' }), 'rock')
    const substring = matchScore(
      buildRelease({ ...neutral, id: '3', title: 'Punk Rockero' }),
      'rock',
    )

    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(substring)
    expect(substring).toBeGreaterThan(0)
  })

  it('ignores diacritics so "mexico" matches "México"', () => {
    expect(matchScore(buildRelease({ country: 'México', id: '1' }), 'mexico')).toBeGreaterThan(0)
  })

  it('prefers a title match over a genre match of the same shape', () => {
    const titleMatch = matchScore(buildRelease({ genre: '', id: '1', title: 'Cumbia' }), 'cumbia')
    const genreMatch = matchScore(
      buildRelease({ genre: 'Cumbia', id: '2', title: 'Otro' }),
      'cumbia',
    )

    expect(titleMatch).toBeGreaterThan(genreMatch)
  })

  it('returns zero when nothing matches', () => {
    expect(matchScore(buildRelease({ id: '1' }), 'salsa')).toBe(0)
  })
})

describe('buildDiscoveryFeed', () => {
  const pool: DiscoveryPool = {
    artists: [buildArtist({ genre: 'Jazz', id: 'a' })],
    facets: { countries: [], genres: [] },
    releases: [
      buildRelease({ creatorSlug: 'a', genre: 'Rock', id: '1' }),
      buildRelease({ creatorSlug: 'b', genre: 'Jazz', id: '2' }),
    ],
    scenes: [buildScene({ id: 's' })],
  }

  it('counts every source when there are no filters', () => {
    const feed = buildDiscoveryFeed(pool, {})

    expect(feed.counts).toEqual({ all: 4, artists: 1, releases: 2, scenes: 1 })
    expect(feed.tiles).toHaveLength(4)
  })

  it('restricts the feed to the active tab', () => {
    const feed = buildDiscoveryFeed(pool, { tab: 'artists' })

    expect(feed.tiles.map((entry) => entry.tile.type)).toEqual(['artist'])
    expect(feed.counts.releases).toBe(2)
  })

  it('drops scenes when a topic chip is active because they carry no genre', () => {
    const feed = buildDiscoveryFeed(pool, { genre: 'Jazz' })

    expect(feed.counts.scenes).toBe(0)
    expect(feed.counts.releases).toBe(1)
    expect(feed.counts.artists).toBe(1)
  })

  it('applies the query across every source', () => {
    const feed = buildDiscoveryFeed(pool, { query: 'escena' })

    expect(feed.counts).toEqual({ all: 1, artists: 0, releases: 0, scenes: 1 })
  })
})
