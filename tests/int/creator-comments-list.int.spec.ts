import { describe, expect, it } from 'vitest'

import {
  getCreatorCommentsDescription,
  getCreatorCommentsEmptyMessage,
  getCreatorCommentsViewerKind,
  getCreatorCommentReleaseHref,
  getCreatorCommentReleaseTitle,
  getCreatorCommentTargetLabel,
  isCreatorCommentsViewer,
} from '@/components/CreatorCommentsListView/shared'

describe('Creator comments list helpers', () => {
  it('allows admin, artists, bands, and editors to use the dashboard comments view', () => {
    expect(isCreatorCommentsViewer({ role: 'admin' })).toBe(true)
    expect(isCreatorCommentsViewer({ editorAccess: false, role: 'creator' })).toBe(true)
    expect(isCreatorCommentsViewer({ editorAccess: true, role: 'creator' })).toBe(true)
    expect(isCreatorCommentsViewer({ role: 'fan' as never })).toBe(false)
  })

  it('returns editor-specific copy for article comments', () => {
    expect(getCreatorCommentsViewerKind({ role: 'creator', userType: 'editor' })).toBe('editorial')
    expect(getCreatorCommentsViewerKind({ editorAccess: true, role: 'creator' })).toBe(
      'editorial',
    )
    expect(getCreatorCommentsDescription('editorial')).toBe(
      'Lee los comentarios que han dejado en tus artículos y entra al detalle de cada uno.',
    )
    expect(
      getCreatorCommentsEmptyMessage({
        hasSearch: false,
        viewerKind: 'editorial',
      }),
    ).toBe('Aún no tienes comentarios por leer, invita a tus lectores a comentar tus artículos.')
  })

  it('builds a public href for release comments', () => {
    expect(
      getCreatorCommentReleaseHref({
        id: 'comment-1',
        release: {
          id: 'release-1',
          profile: {
            id: 'profile-1',
            slug: 'arlo-test',
          },
          slug: 'mi-release',
          title: 'Mi release',
        },
      } as never),
    ).toBe('/arlo-test/release/mi-release#comment-comment-1')
  })

  it('builds a public href for article comments', () => {
    expect(
      getCreatorCommentReleaseHref({
        id: 'comment-2',
        post: {
          slug: 'mi-articulo',
          title: 'Mi articulo',
        },
      } as never),
    ).toBe('/posts/mi-articulo#comment-comment-2')
  })

  it('resolves titles and target labels for both comment sources', () => {
    expect(
      getCreatorCommentReleaseTitle({
        release: {
          title: 'Release title',
        },
      } as never),
    ).toBe('Release title')

    expect(
      getCreatorCommentReleaseTitle({
        post: {
          title: 'Post title',
        },
      } as never),
    ).toBe('Post title')

    expect(getCreatorCommentTargetLabel({ source: 'release-public' } as never)).toBe('Lanzamiento')
    expect(getCreatorCommentTargetLabel({ source: 'article-public' } as never)).toBe('Artículo')
  })
})
