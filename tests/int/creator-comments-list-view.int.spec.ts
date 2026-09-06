import { describe, expect, it } from 'vitest'

import {
  getCreatorCommentAuthorName,
  getCreatorCommentReleaseHref,
  getCreatorCommentsEmptyMessage,
  getCreatorCommentsListHref,
  getCreatorCommentsPage,
  getCreatorCommentsSearchValue,
  isCreatorCommentsViewer,
} from '@/components/CreatorCommentsListView/shared'

describe('creator comments list view helpers', () => {
  it('reads and trims the search term', () => {
    expect(getCreatorCommentsSearchValue({ search: '  hola  ' })).toBe('hola')
  })

  it('defaults the page to one when the value is invalid', () => {
    expect(getCreatorCommentsPage({ page: '0' })).toBe(1)
    expect(getCreatorCommentsPage({ page: 'abc' })).toBe(1)
  })

  it('builds collection hrefs that preserve the simple search query', () => {
    expect(getCreatorCommentsListHref({ page: 2, search: 'rock' })).toBe(
      '/dashboard/collections/comments?search=rock&page=2',
    )
  })

  it('builds the public release anchor when profile and release slugs exist', () => {
    expect(
      getCreatorCommentReleaseHref({
        id: 'comment-1',
        release: {
          id: 'release-1',
          profile: {
            id: 'profile-1',
            slug: 'arlo-test',
          },
          slug: 'nuevo-single',
          title: 'Nuevo single',
        },
      }),
    ).toBe('/arlo-test/release/nuevo-single#comment-comment-1')
  })

  it('returns the creator empty-state copy based on whether a search exists', () => {
    expect(
      getCreatorCommentsEmptyMessage({
        hasSearch: false,
        viewerKind: 'musical',
      }),
    ).toBe(
      'Aún no tienes comentarios por leer, invita a tus fans a comentar tus lanzamientos.',
    )
    expect(
      getCreatorCommentsEmptyMessage({
        hasSearch: true,
        viewerKind: 'musical',
      }),
    ).toBe(
      'No hay resultados. La búsqueda no generó coincidencias.',
    )
  })

  it('uses the consumer profile display name when available', () => {
    expect(
      getCreatorCommentAuthorName({
        displayName: 'Fan Uno',
        id: 'consumer-1',
      } as any),
    ).toBe('Fan Uno')
  })

  it('enables the custom view for admin, artists, bands, and editors', () => {
    expect(isCreatorCommentsViewer({ role: 'creator' })).toBe(true)
    expect(isCreatorCommentsViewer({ editorAccess: true, role: 'creator' })).toBe(true)
    expect(isCreatorCommentsViewer({ role: 'admin' })).toBe(true)
  })
})
