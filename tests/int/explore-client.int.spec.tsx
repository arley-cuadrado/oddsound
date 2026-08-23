import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ExploreClient } from '@/app/(frontend)/search/ExploreClient'
import type { DiscoveryPool } from '@/app/(frontend)/search/discovery/types'

const pool: DiscoveryPool = {
  artists: [
    {
      country: 'Colombia',
      displayName: 'Los Petirrojos',
      genre: 'Rock',
      id: 'artist-1',
      imageUrl: null,
      publishedAt: '2026-02-01T00:00:00.000Z',
      releaseCount: 2,
      slug: 'los-petirrojos',
      type: 'artist',
    },
  ],
  facets: {
    countries: [
      { count: 2, value: 'Colombia' },
      { count: 1, value: 'México' },
    ],
    genres: [
      { count: 2, value: 'Rock' },
      { count: 1, value: 'Cumbia' },
    ],
  },
  releases: [
    {
      country: 'Colombia',
      creatorName: 'Los Petirrojos',
      creatorSlug: 'los-petirrojos',
      genre: 'Rock',
      id: 'release-1',
      imageUrl: null,
      publishedAt: '2026-02-01T00:00:00.000Z',
      slug: 'noche-larga',
      title: 'Noche Larga',
      type: 'release',
    },
    {
      country: 'México',
      creatorName: 'Sonora Azul',
      creatorSlug: 'sonora-azul',
      genre: 'Cumbia',
      id: 'release-2',
      imageUrl: null,
      publishedAt: '2026-01-01T00:00:00.000Z',
      slug: 'mar-adentro',
      title: 'Mar Adentro',
      type: 'release',
    },
  ],
  scenes: [
    {
      id: 'scene-1',
      imageUrl: null,
      publishedAt: '2026-03-01T00:00:00.000Z',
      slug: 'escena-bogota',
      title: 'Escena Bogotá',
      type: 'scene',
    },
  ],
}

function renderExplore(overrides: Partial<React.ComponentProps<typeof ExploreClient>> = {}) {
  return render(
    React.createElement(ExploreClient, {
      initialCountry: '',
      initialGenre: '',
      initialQuery: '',
      initialTab: 'all',
      pool,
      ...overrides,
    }),
  )
}

describe('ExploreClient', () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState(null, '', '/search')
  })

  it('fills the grid with every source before any query is typed', () => {
    renderExplore()

    expect(screen.getByText('Noche Larga')).toBeDefined()
    expect(screen.getByText('Mar Adentro')).toBeDefined()
    expect(screen.getByText('Los Petirrojos')).toBeDefined()
    expect(screen.getByText('Escena Bogotá')).toBeDefined()
  })

  it('filters as the visitor types, ignoring diacritics', async () => {
    renderExplore()

    fireEvent.change(screen.getByPlaceholderText('Comienza a descubrir ;)'), {
      target: { value: 'mexico' },
    })

    await waitFor(() => {
      expect(screen.queryByText('Noche Larga')).toBeNull()
    })

    expect(screen.getByText('Mar Adentro')).toBeDefined()
  })

  it('keeps the query in the URL without a navigation', async () => {
    renderExplore()

    fireEvent.change(screen.getByPlaceholderText('Comienza a descubrir ;)'), {
      target: { value: 'cumbia' },
    })

    await waitFor(() => {
      expect(window.location.search).toBe('?q=cumbia')
    })
  })

  it('narrows the feed to a single type through the tabs', async () => {
    renderExplore()

    fireEvent.click(screen.getByRole('tab', { name: /Artistas/ }))

    await waitFor(() => {
      expect(screen.queryByText('Noche Larga')).toBeNull()
    })

    expect(screen.getByText('Los Petirrojos')).toBeDefined()
  })

  it('filters by topic chip and drops scenes, which carry no genre', async () => {
    renderExplore()

    fireEvent.click(screen.getByRole('button', { name: /Cumbia/ }))

    await waitFor(() => {
      expect(screen.queryByText('Escena Bogotá')).toBeNull()
    })

    expect(screen.getByText('Mar Adentro')).toBeDefined()
    expect(screen.queryByText('Noche Larga')).toBeNull()
  })

  it('restores state from the URL on first render', () => {
    renderExplore({ initialQuery: 'noche' })

    expect(screen.getByText('Noche Larga')).toBeDefined()
    expect(screen.queryByText('Mar Adentro')).toBeNull()
  })

  it('offers a way out when nothing matches', async () => {
    renderExplore()

    fireEvent.change(screen.getByPlaceholderText('Comienza a descubrir ;)'), {
      target: { value: 'reggaeton' },
    })

    await waitFor(() => {
      expect(screen.getByText('No encontramos nada con esos filtros.')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    await waitFor(() => {
      expect(screen.getByText('Noche Larga')).toBeDefined()
    })
  })
})
