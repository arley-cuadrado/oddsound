'use client'

import React from 'react'

import { cn } from '@/utilities/ui'
import type { DiscoveryFacet } from './discovery/types'

type TopicChipsProps = {
  activeCountry: string
  activeGenre: string
  countries: DiscoveryFacet[]
  genres: DiscoveryFacet[]
  onToggleCountry: (value: string) => void
  onToggleGenre: (value: string) => void
}

const chipClassName =
  'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12px] transition'

export const TopicChips: React.FC<TopicChipsProps> = ({
  activeCountry,
  activeGenre,
  countries,
  genres,
  onToggleCountry,
  onToggleGenre,
}) => {
  if (genres.length === 0 && countries.length === 0) return null

  const renderChip = (
    facet: DiscoveryFacet,
    isActive: boolean,
    onToggle: (value: string) => void,
  ) => (
    <button
      aria-pressed={isActive}
      className={cn(
        chipClassName,
        isActive
          ? 'border-transparent bg-[#312e2e] text-white dark:bg-white dark:text-black'
          : 'border-border bg-transparent text-foreground/75 hover:bg-[#f3efe8] dark:border-white/15 dark:text-white/75 dark:hover:bg-white/10',
      )}
      key={facet.value}
      onClick={() => onToggle(facet.value)}
      type="button"
    >
      <span>{facet.value}</span>
      <span
        className={cn(
          'text-[10px]',
          isActive ? 'text-white/70 dark:text-black/60' : 'text-foreground/45 dark:text-white/45',
        )}
      >
        {facet.count}
      </span>
    </button>
  )

  return (
    <div className="space-y-2">
      {genres.length > 0 ? (
        <div
          aria-label="Filtrar por género"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          {genres.map((facet) => renderChip(facet, activeGenre === facet.value, onToggleGenre))}
        </div>
      ) : null}
      {countries.length > 0 ? (
        <div
          aria-label="Filtrar por país"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          {countries.map((facet) =>
            renderChip(facet, activeCountry === facet.value, onToggleCountry),
          )}
        </div>
      ) : null}
    </div>
  )
}
