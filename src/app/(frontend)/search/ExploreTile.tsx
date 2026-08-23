/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'
import type { DiscoveryTile, PositionedTile } from './discovery/types'

type TileContent = {
  badge: null | string
  detail: null | string
  href: string
  imageAlt: string
  meta: null | string
  title: string
}

function getTileContent(tile: DiscoveryTile): TileContent {
  switch (tile.type) {
    case 'artist':
      return {
        badge: 'Artista',
        detail: `${tile.releaseCount} lanzamiento${tile.releaseCount === 1 ? '' : 's'}`,
        href: `/${tile.slug}/releases`,
        imageAlt: tile.displayName,
        meta: [tile.genre, tile.country].filter(Boolean).join(' · ') || null,
        title: tile.displayName,
      }
    case 'scene':
      return {
        badge: 'Escena',
        detail: null,
        href: `/posts/${tile.slug}`,
        imageAlt: tile.title,
        meta: null,
        title: tile.title,
      }
    default:
      return {
        badge: null,
        detail: tile.country || null,
        href: `/${tile.slug}`,
        imageAlt: tile.title,
        meta: [tile.creatorName, tile.genre].filter(Boolean).join(' · ') || null,
        title: tile.title,
      }
  }
}

function getInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || '?'
}

export const ExploreTile: React.FC<{
  eager?: boolean
  positioned: PositionedTile
}> = ({ eager = false, positioned }) => {
  const { heroColumnStart, isHero, tile } = positioned
  const { badge, detail, href, imageAlt, meta, title } = getTileContent(tile)

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900',
        // Every tile carries its own ratio so a hero that ends up without
        // neighbours in its rows still has height instead of collapsing.
        'aspect-[3/4]',
        isHero ? 'col-span-2 row-span-2' : null,
        // Alternates which side the 2x2 hero starts on so the mosaic breathes.
        isHero && heroColumnStart === 2 ? 'col-start-2' : null,
      )}
    >
      <Link className="block h-full w-full" href={href}>
        {tile.imageUrl ? (
          <img
            alt={imageAlt}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            decoding="async"
            loading={eager ? 'eager' : 'lazy'}
            src={tile.imageUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#efebe4] text-2xl font-semibold text-foreground/40 dark:bg-white/5 dark:text-white/40">
            {getInitial(title)}
          </div>
        )}

        {badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white backdrop-blur">
            {badge}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 py-3 text-white">
          <h3
            className={cn(
              'font-semibold leading-snug text-white',
              isHero ? 'text-[13px]' : 'text-[10px]',
            )}
          >
            {title}
          </h3>
          {meta || detail ? (
            <div className="flex w-full flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              {meta ? (
                <p
                  className={cn(
                    'max-w-full leading-snug text-white/90',
                    isHero ? 'text-[11px]' : 'text-[10px]',
                  )}
                >
                  {meta}
                </p>
              ) : null}
              {detail ? (
                <p
                  className={cn(
                    'text-white/90 sm:shrink-0',
                    isHero ? 'text-[11px]' : 'text-[10px]',
                  )}
                >
                  {detail}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
