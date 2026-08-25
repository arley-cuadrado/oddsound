import type { Metadata } from 'next/types'

import React from 'react'

import { DISCOVERY_DESCRIPTION, SITE_NAME } from '@/seo/site'
import { getDiscoveryPool } from './discovery/getDiscoveryPool'
import type { DiscoveryTab } from './discovery/types'
import { ExploreClient } from './ExploreClient'

import PageClient from './page.client'

export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{
    country?: string
    genre?: string
    q?: string
    tab?: string
  }>
}

const VALID_TABS: DiscoveryTab[] = ['all', 'artists', 'releases', 'scenes']

function parseTab(value: string | undefined): DiscoveryTab {
  return VALID_TABS.includes(value as DiscoveryTab) ? (value as DiscoveryTab) : 'all'
}

export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { country, genre, q, tab } = await searchParamsPromise
  const pool = await getDiscoveryPool()

  return (
    <div className="pb-4 pt-0 md:pb-12 md:pt-16">
      <PageClient />
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <div className="prose dark:prose-invert max-w-none text-center">
            <h1>Discover</h1>
            <p className="mx-auto mb-4 w-full text-center text-[13px] lg:w-[50%]">
              Explora música más allá de lo usual. Encuentra artistas, lanzamientos y escenas.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-[50rem]">
          {/* The whole pool ships once and the client filters in memory, so
              typing and scrolling never hit the server again. */}
          <ExploreClient
            initialCountry={country?.trim() || ''}
            initialGenre={genre?.trim() || ''}
            initialQuery={q?.trim() || ''}
            initialTab={parseTab(tab)}
            pool={pool}
          />
        </div>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `${SITE_NAME} Discovery`,
    description: DISCOVERY_DESCRIPTION,
    alternates: {
      canonical: '/search',
    },
  }
}
