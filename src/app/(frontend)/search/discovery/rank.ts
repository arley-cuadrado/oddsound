import { normalizeSearchValue } from '@/utilities/normalizeSearchValue'

import type {
  ArtistTile,
  DiscoveryFeed,
  DiscoveryFilters,
  DiscoveryPool,
  DiscoveryTab,
  DiscoveryTile,
  PositionedTile,
  ReleaseTile,
  SceneTile,
} from './types'

/** One non-release tile is injected after every block of this many releases. */
export const INJECTION_INTERVAL = 6
/** The first tile of every block of this size is rendered as a 2x2 hero. */
export const HERO_BLOCK_SIZE = 6
/** How many recent tiles the genre-diversity rule looks back at. */
export const DIVERSITY_GENRE_WINDOW = 4
/** How many tiles of the same genre are tolerated inside that window. */
export const DIVERSITY_GENRE_MAX = 2

const EXACT_MATCH_SCORE = 100
const PREFIX_MATCH_SCORE = 50
const SUBSTRING_MATCH_SCORE = 10
const STRONG_FIELD_BONUS = 5

type SearchableField = {
  strong: boolean
  value: string
}

export function getTileGenre(tile: DiscoveryTile) {
  return tile.type === 'scene' ? '' : tile.genre
}

export function getTileCountry(tile: DiscoveryTile) {
  return tile.type === 'scene' ? '' : tile.country
}

function getCreatorKey(tile: ReleaseTile) {
  return normalizeSearchValue(tile.creatorSlug || tile.creatorName)
}

function getSearchableFields(tile: DiscoveryTile): SearchableField[] {
  switch (tile.type) {
    case 'artist':
      return [
        { strong: true, value: tile.displayName },
        { strong: false, value: tile.genre },
        { strong: false, value: tile.country },
      ]
    case 'scene':
      return [{ strong: true, value: tile.title }]
    default:
      return [
        { strong: true, value: tile.title },
        { strong: true, value: tile.creatorName },
        { strong: false, value: tile.genre },
        { strong: false, value: tile.country },
      ]
  }
}

/**
 * Scores a tile against an already normalized query. Exact matches outrank
 * prefixes, which outrank substrings; matches on a title or an artist name
 * outrank matches on a genre or a country.
 */
export function matchScore(tile: DiscoveryTile, normalizedQuery: string) {
  if (!normalizedQuery) return 0

  let best = 0

  getSearchableFields(tile).forEach((field) => {
    const value = normalizeSearchValue(field.value)

    if (!value) return

    let score = 0

    if (value === normalizedQuery) {
      score = EXACT_MATCH_SCORE
    } else if (value.startsWith(normalizedQuery)) {
      score = PREFIX_MATCH_SCORE
    } else if (value.includes(normalizedQuery)) {
      score = SUBSTRING_MATCH_SCORE
    }

    if (!score) return

    if (field.strong) {
      score += STRONG_FIELD_BONUS
    }

    if (score > best) {
      best = score
    }
  })

  return best
}

function toTimestamp(value: null | string | undefined) {
  if (!value) return 0

  const timestamp = new Date(value).getTime()

  return Number.isNaN(timestamp) ? 0 : timestamp
}

/** Newest first. Items without a publish date sink to the bottom. */
export function sortByRecency<T extends { publishedAt: null | string }>(items: T[]): T[] {
  return [...items].sort((a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt))
}

function hasDifferentCreator(candidate: ReleaseTile, ordered: ReleaseTile[]) {
  const previous = ordered[ordered.length - 1]

  return !previous || getCreatorKey(previous) !== getCreatorKey(candidate)
}

function hasGenreHeadroom(candidate: ReleaseTile, ordered: ReleaseTile[]) {
  const genre = normalizeSearchValue(candidate.genre)

  if (!genre) return true

  const recent = ordered.slice(-DIVERSITY_GENRE_WINDOW)
  const sameGenreCount = recent.filter((tile) => normalizeSearchValue(tile.genre) === genre).length

  return sameGenreCount < DIVERSITY_GENRE_MAX
}

/**
 * Instagram's final reranking stage: never show two consecutive posts from the
 * same author. The author rule is hard and the genre spread is a preference,
 * so when nothing satisfies both the genre rule yields first — a catalog where
 * every release shares one genre must not force two artists back to back.
 * Falls back to the head of the queue so no release is ever dropped.
 */
export function diversify(releases: ReleaseTile[]): ReleaseTile[] {
  const remaining = [...releases]
  const ordered: ReleaseTile[] = []

  while (remaining.length > 0) {
    let index = remaining.findIndex(
      (candidate) =>
        hasDifferentCreator(candidate, ordered) && hasGenreHeadroom(candidate, ordered),
    )

    if (index === -1) {
      index = remaining.findIndex((candidate) => hasDifferentCreator(candidate, ordered))
    }

    const [picked] = remaining.splice(index === -1 ? 0 : index, 1)

    if (picked) {
      ordered.push(picked)
    }
  }

  return ordered
}

/**
 * Mixes the three retrieval sources into a single stream: one artist or scene
 * tile after every `INJECTION_INTERVAL` releases, alternating between the two.
 * Whatever is left over is appended so no source stays hidden on small catalogs.
 */
export function interleave({
  artists,
  releases,
  scenes,
}: {
  artists: ArtistTile[]
  releases: ReleaseTile[]
  scenes: SceneTile[]
}): DiscoveryTile[] {
  const tiles: DiscoveryTile[] = []
  let artistIndex = 0
  let sceneIndex = 0
  let guestTurn = 0

  const takeGuest = (): DiscoveryTile | null => {
    const preferArtist = guestTurn % 2 === 0
    const artist = artists[artistIndex]
    const scene = scenes[sceneIndex]
    const guest = preferArtist ? artist || scene : scene || artist

    if (!guest) return null

    if (guest.type === 'artist') {
      artistIndex += 1
    } else {
      sceneIndex += 1
    }

    guestTurn += 1

    return guest
  }

  releases.forEach((release, index) => {
    tiles.push(release)

    if ((index + 1) % INJECTION_INTERVAL !== 0) return

    const guest = takeGuest()

    if (guest) {
      tiles.push(guest)
    }
  })

  let leftover = takeGuest()

  while (leftover) {
    tiles.push(leftover)
    leftover = takeGuest()
  }

  return tiles
}

/**
 * Marks the first tile of every block as a 2x2 hero, alternating the side it
 * starts on so the mosaic keeps the Explore rhythm instead of a straight column.
 */
export function assignHeroTiles(tiles: DiscoveryTile[]): PositionedTile[] {
  return tiles.map((tile, index) => {
    const isHero = index % HERO_BLOCK_SIZE === 0
    const blockIndex = Math.floor(index / HERO_BLOCK_SIZE)

    return {
      heroColumnStart: isHero && blockIndex % 2 === 1 ? 2 : 1,
      isHero,
      tile,
    }
  })
}

function matchesFacets(tile: DiscoveryTile, genre: string, country: string) {
  if (genre && normalizeSearchValue(getTileGenre(tile)) !== genre) return false
  if (country && normalizeSearchValue(getTileCountry(tile)) !== country) return false

  return true
}

function applyQuery<T extends DiscoveryTile>(tiles: T[], normalizedQuery: string): T[] {
  if (!normalizedQuery) return sortByRecency(tiles)

  return tiles
    .map((tile) => ({ score: matchScore(tile, normalizedQuery), tile }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      return toTimestamp(b.tile.publishedAt) - toTimestamp(a.tile.publishedAt)
    })
    .map((entry) => entry.tile)
}

/**
 * Runs the whole editorial funnel: facet filters, query matching, per-source
 * ordering, diversity reranking, source interleaving and hero placement.
 * Deterministic on purpose so the server HTML and the first client render match.
 */
export function buildDiscoveryFeed(pool: DiscoveryPool, filters: DiscoveryFilters): DiscoveryFeed {
  const normalizedQuery = normalizeSearchValue(filters.query)
  const genre = normalizeSearchValue(filters.genre)
  const country = normalizeSearchValue(filters.country)
  const tab: DiscoveryTab = filters.tab || 'all'

  const releases = diversify(
    applyQuery(
      pool.releases.filter((tile) => matchesFacets(tile, genre, country)),
      normalizedQuery,
    ),
  )
  const artists = applyQuery(
    pool.artists.filter((tile) => matchesFacets(tile, genre, country)),
    normalizedQuery,
  )
  // Scenes carry no genre or country, so an active topic chip excludes them.
  const scenes = genre || country ? [] : applyQuery(pool.scenes, normalizedQuery)

  const counts: Record<DiscoveryTab, number> = {
    all: releases.length + artists.length + scenes.length,
    artists: artists.length,
    releases: releases.length,
    scenes: scenes.length,
  }

  let tiles: DiscoveryTile[]

  switch (tab) {
    case 'artists':
      tiles = artists
      break
    case 'releases':
      tiles = releases
      break
    case 'scenes':
      tiles = scenes
      break
    default:
      tiles = interleave({ artists, releases, scenes })
  }

  return {
    counts,
    tiles: assignHeroTiles(tiles),
  }
}
