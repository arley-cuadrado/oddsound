export type DiscoveryTab = 'all' | 'artists' | 'releases' | 'scenes'

export type ReleaseTile = {
  country: string
  creatorName: string
  creatorSlug: null | string
  genre: string
  id: string
  imageUrl: null | string
  publishedAt: null | string
  slug: string
  title: string
  type: 'release'
}

export type ArtistTile = {
  country: string
  displayName: string
  genre: string
  id: string
  imageUrl: null | string
  /** Publish date of the artist's latest release, used to order the rotation. */
  publishedAt: null | string
  releaseCount: number
  slug: string
  type: 'artist'
}

export type SceneTile = {
  id: string
  imageUrl: null | string
  publishedAt: null | string
  slug: string
  title: string
  type: 'scene'
}

export type DiscoveryTile = ArtistTile | ReleaseTile | SceneTile

export type DiscoveryFacet = {
  count: number
  value: string
}

export type DiscoveryPool = {
  artists: ArtistTile[]
  facets: {
    countries: DiscoveryFacet[]
    genres: DiscoveryFacet[]
  }
  releases: ReleaseTile[]
  scenes: SceneTile[]
}

export type DiscoveryFilters = {
  country?: null | string
  genre?: null | string
  query?: null | string
  tab?: DiscoveryTab
}

export type PositionedTile = {
  /** 1 places the hero on columns 1-2, 2 places it on columns 2-3. */
  heroColumnStart: 1 | 2
  isHero: boolean
  tile: DiscoveryTile
}

export type DiscoveryFeed = {
  counts: Record<DiscoveryTab, number>
  tiles: PositionedTile[]
}
