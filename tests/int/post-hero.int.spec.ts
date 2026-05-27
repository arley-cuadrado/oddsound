import React from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Post } from '@/payload-types'
import { PostHero } from '@/heros/PostHero'
import { formatRelativePublishedAt } from '@/utilities/formatRelativePublishedAt'

const setHeaderThemeMock = vi.fn()

vi.mock('@/providers/HeaderTheme', () => ({
  useHeaderTheme: () => ({
    setHeaderTheme: setHeaderThemeMock,
  }),
}))

vi.mock('@/components/Media', () => ({
  Media: ({ resource }: { resource: { alt?: string | null } }) =>
    React.createElement('div', {
      'data-testid': 'post-hero-media',
      'data-alt': resource?.alt || '',
    }),
}))

describe('formatRelativePublishedAt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats yesterday in Spanish', () => {
    expect(formatRelativePublishedAt('2026-05-26T12:00:00.000Z')).toBe('ayer')
  })

  it('formats multiple past days in Spanish', () => {
    expect(formatRelativePublishedAt('2026-05-25T12:00:00.000Z')).toBe('anteayer')
  })
})

describe('PostHero', () => {
  beforeEach(() => {
    setHeaderThemeMock.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the high impact style metadata with relative published text', () => {
    const post = {
      id: 'post-1',
      title: 'Administrador en vivo',
      publishedAt: '2026-05-26T12:00:00.000Z',
      heroImage: {
        id: 'media-1',
        alt: 'Portada del post',
        updatedAt: '2026-05-26T12:00:00.000Z',
        url: 'https://cdn.oddsound.test/post.jpg',
      },
      populatedAuthors: [{ id: 'user-1', name: 'Arlo' }],
      categories: [{ id: 'category-1', title: 'Noticias' }],
    } as unknown as Post

    render(React.createElement(PostHero, { post }))

    expect(screen.getByRole('heading', { name: 'Administrador en vivo' })).toBeTruthy()
    expect(screen.getByText('Noticias')).toBeTruthy()
    expect(screen.getByText('Arlo')).toBeTruthy()
    expect(screen.getByText('Publicado: ayer')).toBeTruthy()
    expect(screen.getByTestId('post-hero-media')).toBeTruthy()
    expect(setHeaderThemeMock).toHaveBeenCalledWith('dark')
  })
})
