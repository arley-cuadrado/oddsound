'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Search } from '@/search/Component'
import { useDebounce } from '@/utilities/useDebounce'
import { buildDiscoveryFeed } from './discovery/rank'
import type { DiscoveryPool, DiscoveryTab } from './discovery/types'
import { ExploreTile } from './ExploreTile'
import { ResultTabs } from './ResultTabs'
import { TopicChips } from './TopicChips'

const TILES_PER_BATCH = 24
/** Tiles above the fold skip lazy loading so the first paint is not empty. */
const EAGER_TILES = 6
/** Keeps typing responsive without re-ranking on every keystroke. */
const FILTER_DEBOUNCE_MS = 120
/** The URL trails further behind so the address bar is not rewritten per key. */
const URL_DEBOUNCE_MS = 400

type ExploreClientProps = {
  initialCountry: string
  initialGenre: string
  initialQuery: string
  initialTab: DiscoveryTab
  pool: DiscoveryPool
}

export const ExploreClient: React.FC<ExploreClientProps> = ({
  initialCountry,
  initialGenre,
  initialQuery,
  initialTab,
  pool,
}) => {
  const [query, setQuery] = useState(initialQuery)
  const [genre, setGenre] = useState(initialGenre)
  const [country, setCountry] = useState(initialCountry)
  const [tab, setTab] = useState<DiscoveryTab>(initialTab)
  const [visibleCount, setVisibleCount] = useState(TILES_PER_BATCH)

  const filterQuery = useDebounce(query, FILTER_DEBOUNCE_MS)
  const urlQuery = useDebounce(query, URL_DEBOUNCE_MS)

  const feed = useMemo(
    () => buildDiscoveryFeed(pool, { country, genre, query: filterQuery, tab }),
    [country, filterQuery, genre, pool, tab],
  )

  const hasFilters = Boolean(filterQuery.trim() || genre || country)
  const isPoolEmpty =
    pool.releases.length === 0 && pool.artists.length === 0 && pool.scenes.length === 0
  const visibleTiles = feed.tiles.slice(0, visibleCount)
  const hasMore = visibleCount < feed.tiles.length

  // Sync the URL through the History API instead of the router: the state is
  // shareable and restorable without re-running the server component on every
  // keystroke, which would defeat the whole point of filtering in memory.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const applyParam = (key: string, value: string) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }

    applyParam('q', urlQuery.trim())
    applyParam('genre', genre)
    applyParam('country', country)
    applyParam('tab', tab === 'all' ? '' : tab)

    const search = params.toString()
    const nextURL = `${window.location.pathname}${search ? `?${search}` : ''}`
    const currentURL = `${window.location.pathname}${window.location.search}`

    if (nextURL !== currentURL) {
      window.history.replaceState(null, '', nextURL)
    }
  }, [country, genre, tab, urlQuery])

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current

    if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((previous) => previous + TILES_PER_BATCH)
        }
      },
      { rootMargin: '600px 0px' },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore])

  const toggleGenre = useCallback((value: string) => {
    setVisibleCount(TILES_PER_BATCH)
    setGenre((previous) => (previous === value ? '' : value))
  }, [])

  const toggleCountry = useCallback((value: string) => {
    setVisibleCount(TILES_PER_BATCH)
    setCountry((previous) => (previous === value ? '' : value))
  }, [])

  const clearFilters = useCallback(() => {
    setVisibleCount(TILES_PER_BATCH)
    setQuery('')
    setGenre('')
    setCountry('')
    setTab('all')
  }, [])

  const handleQueryChange = useCallback((value: string) => {
    setVisibleCount(TILES_PER_BATCH)
    setQuery(value)
  }, [])

  const handleTabChange = useCallback((value: DiscoveryTab) => {
    setVisibleCount(TILES_PER_BATCH)
    setTab(value)
  }, [])

  return (
    <div className="space-y-6">
      <Search onValueChange={handleQueryChange} value={query} />

      <TopicChips
        activeCountry={country}
        activeGenre={genre}
        countries={pool.facets.countries}
        genres={pool.facets.genres}
        onToggleCountry={toggleCountry}
        onToggleGenre={toggleGenre}
      />

      <ResultTabs activeTab={tab} counts={feed.counts} onChange={handleTabChange} />

      {visibleTiles.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 [grid-auto-flow:dense] sm:gap-2">
          {visibleTiles.map((positioned, index) => (
            <ExploreTile
              eager={index < EAGER_TILES}
              key={`${positioned.tile.type}-${positioned.tile.id}`}
              positioned={positioned}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-[13px] text-[#777] dark:text-[#858c98]">
          {isPoolEmpty ? (
            <p>Aún no hay lanzamientos publicados.</p>
          ) : (
            <div className="space-y-4">
              <p>No encontramos nada con esos filtros.</p>
              {hasFilters ? (
                <button
                  className="cursor-pointer text-[13px] font-medium text-foreground underline underline-offset-4 dark:text-white"
                  onClick={clearFilters}
                  type="button"
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}

      {hasMore ? <div aria-hidden="true" className="h-px w-full" ref={sentinelRef} /> : null}
    </div>
  )
}
